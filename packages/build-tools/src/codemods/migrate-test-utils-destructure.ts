/**
 * migrate-test-utils-destructure.ts
 *
 * Phase 3 Sprint 4b #1 codemod. Converts the two `.test.ts.todo` patterns:
 *
 *   Pattern A — destructure off the legacy testUtils shim:
 *
 *     const { checkSetup, queryFixture } = axe.testUtils;
 *     // ...
 *     checkSetup('<div/>');
 *
 *     →
 *
 *     import { checkSetup, queryFixture } from '@helpers/check-helpers';
 *     // ...
 *     checkSetup('<div/>');
 *
 *   Pattern B — bare property access:
 *
 *     axe.testUtils.checkSetup('<div/>');
 *
 *     →
 *
 *     import { checkSetup } from '@helpers/check-helpers';
 *     // ...
 *     checkSetup('<div/>');
 *
 * Helper-set boundaries are encoded as two readonly sets:
 *
 *   • EXPOSED_HELPERS — re-published from `@helpers/check-helpers` and safe to
 *     mechanically rewrite to a named import.
 *   • BLOCKED_HELPERS — known-not-to-be-re-exposed legacy testUtils symbols
 *     (`captureError`, `html`, `assertStylesheet`, `injectIntoFixture`,
 *     `addStyleSheet`, `removeStyleSheet`, `isIE11`). A file that touches any
 *     blocker — even alongside exposed helpers — is left untouched and
 *     surfaced as a skip with a refined FIXME.
 *
 * Idempotency: running the codemod twice produces no diff. Existing
 * `import { ... } from '@helpers/check-helpers'` declarations are merged
 * (no duplicate specifiers) rather than re-injected.
 *
 * Out of scope:
 *   • The codemod is AST-driven, so `axe.testUtils` references inside string
 *     literals or comments are NOT rewritten and do NOT trigger skip logic.
 *   • The codemod only touches `.test.ts.todo` content fed in via the runner
 *     wrapper. It does not walk the filesystem on its own.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ImportDeclaration,
  Project,
  QuoteKind,
  SourceFile,
  SyntaxKind,
  type Node,
  type PropertyAccessExpression,
  type VariableDeclaration,
} from "ts-morph";

// ---------------------------------------------------------------------------
// Helper allowlist / blocklist.
// ---------------------------------------------------------------------------

/** Helpers re-exported from `@helpers/check-helpers`. Safe to import by name. */
export const EXPOSED_HELPERS: ReadonlySet<string> = new Set([
  "checkSetup",
  "queryFixture",
  "fixtureSetup",
  "flatTreeSetup",
  "queryShadowFixture",
  "shadowCheckSetup",
  "createMockCheckContext",
  "getCheckEvaluate",
  "getCheckEvaluateESM",
  "shadowSupport",
  "axe",
  "checks",
]);

/**
 * Helpers we have explicitly chosen NOT to re-expose. Touching one of these
 * makes the file ineligible for mechanical migration; the runner stamps a
 * refined FIXME naming the offending helper.
 */
export const BLOCKED_HELPERS: ReadonlySet<string> = new Set([
  "captureError",
  "html",
  "assertStylesheet",
  "injectIntoFixture",
  "addStyleSheet",
  "removeStyleSheet",
  "isIE11",
]);

const HELPERS_MODULE = "@helpers/check-helpers";

// ---------------------------------------------------------------------------
// Public types.
// ---------------------------------------------------------------------------

export interface MigrateTestUtilsResult {
  /** The migrated source. When `skipped` is true this equals the input. */
  readonly source: string;
  /** True when the file was left untouched because of a blocker. */
  readonly skipped: boolean;
  /**
   * Human-readable reason for skipping (helper name + message). Empty when
   * `skipped` is false.
   */
  readonly skipReason: string;
  /** Helpers that ended up imported from `@helpers/check-helpers`. */
  readonly addedImports: readonly string[];
  /** Number of `axe.testUtils.X` references rewritten (Pattern A + B). */
  readonly rewrites: number;
}

// ---------------------------------------------------------------------------
// Detection helpers — purely structural so we don't false-positive on strings
// or comments containing `axe.testUtils`.
// ---------------------------------------------------------------------------

/**
 * Return true when `node` is a PropertyAccessExpression of the form
 * `axe.testUtils` (no further qualification).
 */
function isAxeTestUtilsAccess(node: Node): node is PropertyAccessExpression {
  if (node.getKind() !== SyntaxKind.PropertyAccessExpression) return false;
  const pae = node.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
  if (pae.getName() !== "testUtils") return false;
  const inner = pae.getExpression();
  return (
    inner.getKind() === SyntaxKind.Identifier && inner.getText() === "axe"
  );
}

/**
 * Walk every PropertyAccessExpression in the file and yield the ones whose
 * left-hand side is `axe.testUtils.<name>` — i.e. one level deeper than
 * `axe.testUtils`. The parent is always a PropertyAccessExpression itself.
 */
function* iterTestUtilsHelperAccess(
  sourceFile: SourceFile
): Generator<{ node: PropertyAccessExpression; name: string }> {
  for (const pae of sourceFile.getDescendantsOfKind(
    SyntaxKind.PropertyAccessExpression
  )) {
    if (pae.wasForgotten()) continue;
    const inner = pae.getExpression();
    if (!isAxeTestUtilsAccess(inner)) continue;
    yield { node: pae, name: pae.getName() };
  }
}

/**
 * Identify `const X = axe.testUtils.Y;` single-binding declarations. These are
 * the Pattern-C shape — a local alias for one helper. We yield the local name
 * (X) and the helper name (Y); the rewrite pass drops the declaration when
 * `X === Y` (otherwise an alias rewrite would create a self-referential TDZ
 * trap once Pattern B converts the RHS) and skips the file when `X !== Y`
 * (we don't currently emit `import { Y as X }` aliases — that would require a
 * second pass over every reference to `X`).
 */
function* iterTestUtilsHelperBindings(
  sourceFile: SourceFile
): Generator<{
  decl: VariableDeclaration;
  localName: string;
  helperName: string;
}> {
  for (const decl of sourceFile.getDescendantsOfKind(
    SyntaxKind.VariableDeclaration
  )) {
    if (decl.wasForgotten()) continue;
    const init = decl.getInitializer();
    if (!init) continue;
    if (init.getKind() !== SyntaxKind.PropertyAccessExpression) continue;
    const initPae = init.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
    if (!isAxeTestUtilsAccess(initPae.getExpression())) continue;
    const nameNode = decl.getNameNode();
    if (nameNode.getKind() !== SyntaxKind.Identifier) continue;
    yield {
      decl,
      localName: nameNode.getText(),
      helperName: initPae.getName(),
    };
  }
}

/**
 * Identify `const { a, b } = axe.testUtils;` declarations and yield each one
 * paired with the bound names it introduces (only object-binding-pattern
 * shapes — `const x = axe.testUtils;` is intentionally ignored because the
 * subsequent `x.helper(...)` calls would require value-flow tracking we don't
 * want to re-implement here).
 */
function* iterTestUtilsDestructures(
  sourceFile: SourceFile
): Generator<{ decl: VariableDeclaration; names: readonly string[] }> {
  for (const decl of sourceFile.getDescendantsOfKind(
    SyntaxKind.VariableDeclaration
  )) {
    if (decl.wasForgotten()) continue;
    const init = decl.getInitializer();
    if (!init || !isAxeTestUtilsAccess(init)) continue;
    const nameNode = decl.getNameNode();
    if (nameNode.getKind() !== SyntaxKind.ObjectBindingPattern) continue;
    const obp = nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern);
    const names: string[] = [];
    for (const element of obp.getElements()) {
      // We only support plain `{ name }` and `{ propertyName: name }` shapes.
      // The latter rebinds the symbol locally — for those we keep the local
      // alias as the imported name + alias clause.
      const propNameNode = element.getPropertyNameNode();
      const helperName = propNameNode
        ? propNameNode.getText()
        : element.getName();
      names.push(helperName);
    }
    yield { decl, names };
  }
}

// ---------------------------------------------------------------------------
// Import merge helper.
// ---------------------------------------------------------------------------

/**
 * Merge a set of named imports into the file's existing
 * `import ... from '@helpers/check-helpers'` declaration if present, or
 * insert a new declaration at the top of the file. Idempotent — names already
 * imported are not duplicated.
 *
 * Returns the list of names that were newly added (so the result can report
 * exactly what changed).
 */
function ensureHelpersImport(
  sourceFile: SourceFile,
  names: readonly string[]
): readonly string[] {
  if (names.length === 0) return [];
  const sortedUnique = [...new Set(names)].sort();

  const existing = sourceFile
    .getImportDeclarations()
    .find(
      (imp: ImportDeclaration) =>
        imp.getModuleSpecifierValue() === HELPERS_MODULE
    );

  if (existing) {
    const already = new Set(
      existing.getNamedImports().map((ni) => ni.getName())
    );
    const toAdd = sortedUnique.filter((n) => !already.has(n));
    if (toAdd.length === 0) return [];
    existing.addNamedImports(toAdd.map((name) => ({ name })));
    return toAdd;
  }

  // Insert the new import after any existing import declarations so the
  // file-level import block stays contiguous.
  const existingImports = sourceFile.getImportDeclarations();
  const insertIdx = existingImports.length;
  sourceFile.insertImportDeclaration(insertIdx, {
    namedImports: sortedUnique.map((name) => ({ name })),
    moduleSpecifier: HELPERS_MODULE,
  });
  return sortedUnique;
}

// ---------------------------------------------------------------------------
// Main rewrite.
// ---------------------------------------------------------------------------

/**
 * Run the codemod against an in-memory source string.
 */
export function migrateTestUtilsDestructure(
  content: string
): MigrateTestUtilsResult {
  // Quick string-level escape hatch — if the file has no `axe.testUtils`
  // mention at all, skip the AST round-trip entirely. The substring check
  // catches comments + strings too, but we re-validate via AST below before
  // making any decision.
  if (!content.includes("axe.testUtils")) {
    return {
      source: content,
      skipped: false,
      skipReason: "",
      addedImports: [],
      rewrites: 0,
    };
  }

  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    manipulationSettings: {
      // The axe-core codebase uses single-quoted strings — match that so the
      // injected imports merge cleanly with the existing test-file style.
      quoteKind: QuoteKind.Single,
    },
    compilerOptions: {
      allowJs: true,
      target: 99,
      module: 99,
    },
  });

  const sourceFile = project.createSourceFile(
    "__test-utils-destructure__.ts",
    content,
    { overwrite: true }
  );

  // ----------------------------------------------------------------- pass 1
  // Detect blockers. We MUST scan everything before rewriting so a blocker in
  // a multi-helper destructure poisons the whole file rather than just the
  // bound name.
  const referencedHelpers = new Set<string>();

  for (const { name } of iterTestUtilsHelperAccess(sourceFile)) {
    referencedHelpers.add(name);
  }
  for (const { names } of iterTestUtilsDestructures(sourceFile)) {
    for (const n of names) referencedHelpers.add(n);
  }
  // Pattern-C bindings: surface the helper name as referenced. A local alias
  // (`const x = axe.testUtils.checkSetup`) is reported as a skip below if the
  // local-name and helper-name diverge, since we don't emit `as`-imports.
  const helperBindings = [...iterTestUtilsHelperBindings(sourceFile)];
  for (const { helperName } of helperBindings) {
    referencedHelpers.add(helperName);
  }
  const aliasMismatch = helperBindings.find(
    (b) => b.localName !== b.helperName
  );
  if (aliasMismatch) {
    return {
      source: content,
      skipped: true,
      skipReason: `helper not exposed (will not be re-exposed): non-trivial alias \`const ${aliasMismatch.localName} = axe.testUtils.${aliasMismatch.helperName}\` requires manual rewrite`,
      addedImports: [],
      rewrites: 0,
    };
  }

  if (referencedHelpers.size === 0) {
    // The substring `axe.testUtils` only showed up in strings/comments — no
    // structural reference. Idempotent no-op.
    return {
      source: sourceFile.getFullText(),
      skipped: false,
      skipReason: "",
      addedImports: [],
      rewrites: 0,
    };
  }

  const blockers = [...referencedHelpers].filter((n) =>
    BLOCKED_HELPERS.has(n)
  );
  if (blockers.length > 0) {
    return {
      source: content, // unchanged
      skipped: true,
      skipReason: `helper not exposed (will not be re-exposed): ${blockers
        .sort()
        .join(", ")}`,
      addedImports: [],
      rewrites: 0,
    };
  }

  // We also bail if the file references a name through `axe.testUtils.X` that
  // is NOT in either set. Those are unrecognized legacy helpers — surfacing
  // them as a skip is safer than a silent rewrite that leaves an unresolved
  // import.
  const unknown = [...referencedHelpers].filter(
    (n) => !EXPOSED_HELPERS.has(n) && !BLOCKED_HELPERS.has(n)
  );
  if (unknown.length > 0) {
    return {
      source: content,
      skipped: true,
      skipReason: `helper not exposed (will not be re-exposed): ${unknown
        .sort()
        .join(", ")}`,
      addedImports: [],
      rewrites: 0,
    };
  }

  // --------------------------------------------------------------- pass 1.5
  // Drop `const X = axe.testUtils.X;` Pattern-C declarations BEFORE Pattern-B
  // rewrites the RHS. If we let Pattern B run first, the RHS becomes `X` and
  // the declaration becomes `const X = X;` — a TDZ trap.
  for (const { decl, localName, helperName } of helperBindings) {
    if (decl.wasForgotten()) continue;
    if (localName !== helperName) continue; // already rejected above
    const stmt = decl.getVariableStatement();
    if (stmt && stmt.getDeclarations().length === 1) {
      stmt.remove();
    } else {
      decl.remove();
    }
  }

  // Detect remaining shadowing: a local `const X = …` declaration whose name
  // matches a helper we're about to import. After Pattern-B rewrites the
  // initializer, the declaration becomes `const X = X.something;` — a TDZ
  // trap that crashes at module load. Skip the file rather than emitting
  // broken code; the ` shadowed local binding` reason gets the file
  // re-discoverable on a future run.
  const helperImportNames = new Set<string>();
  for (const n of referencedHelpers) {
    if (EXPOSED_HELPERS.has(n)) helperImportNames.add(n);
  }
  for (const decl of sourceFile.getDescendantsOfKind(
    SyntaxKind.VariableDeclaration
  )) {
    if (decl.wasForgotten()) continue;
    const init = decl.getInitializer();
    if (!init) continue;
    const nameNode = decl.getNameNode();
    if (nameNode.getKind() !== SyntaxKind.Identifier) continue;
    const localName = nameNode.getText();
    if (!helperImportNames.has(localName)) continue;
    // Does the RHS reference `axe.testUtils.<localName>`? If so we'd shadow
    // ourselves on Pattern-B rewrite.
    const initText = init.getText();
    if (initText.includes(`axe.testUtils.${localName}`)) {
      return {
        source: content,
        skipped: true,
        skipReason: `helper not exposed (will not be re-exposed): local \`${localName}\` shadows helper import — manual rewrite required`,
        addedImports: [],
        rewrites: 0,
      };
    }
  }

  // ----------------------------------------------------------------- pass 2
  // Rewrite Pattern B (`axe.testUtils.X(...)` → `X(...)`).
  let rewriteCount = 0;
  for (const { node, name } of [...iterTestUtilsHelperAccess(sourceFile)]) {
    if (node.wasForgotten()) continue;
    if (!EXPOSED_HELPERS.has(name)) continue;
    node.replaceWithText(name);
    rewriteCount++;
  }

  // ----------------------------------------------------------------- pass 3
  // Remove `const { ... } = axe.testUtils;` declarations whose bound names
  // are all exposed (we already bailed on blockers/unknowns above).
  const importNames = new Set<string>();
  for (const { decl, names } of [...iterTestUtilsDestructures(sourceFile)]) {
    if (decl.wasForgotten()) continue;
    for (const n of names) importNames.add(n);
    const stmt = decl.getVariableStatement();
    // If the declaration is the sole child of the statement, drop the whole
    // statement. Otherwise (multi-declarator `const a = x, { y } = axe.testUtils`)
    // remove just this declarator.
    if (stmt && stmt.getDeclarations().length === 1) {
      stmt.remove();
    } else {
      decl.remove();
    }
    rewriteCount++;
  }

  // Pattern B references also need imports.
  for (const name of referencedHelpers) {
    if (EXPOSED_HELPERS.has(name)) importNames.add(name);
  }

  const added = ensureHelpersImport(sourceFile, [...importNames]);

  // Final string-level passes: add the vitest globals import and the bare
  // `axe` helper import (when the file references `axe.X` outside the
  // helpers it just imported). These are idempotent string ops.
  let outSource = sourceFile.getFullText();
  outSource = ensureVitestImport(outSource);
  outSource = ensureHelpersAxeImport(outSource);

  return {
    source: outSource,
    skipped: false,
    skipReason: "",
    addedImports: added,
    rewrites: rewriteCount,
  };
}

/** Convenience wrapper returning only the rewritten source (or original on skip). */
export function migrateTestUtilsDestructureSource(content: string): string {
  return migrateTestUtilsDestructure(content).source;
}

// ---------------------------------------------------------------------------
// Companion import injectors. The browser project doesn't enable globals, so
// any file that uses `describe/it/expect` needs an explicit named import. We
// also auto-add `axe` from `@helpers/check-helpers` when the file references
// `axe.foo` (the legacy Karma global). These mirror the chai codemod's
// `ensureVitestImport` / `ensureHelpersImport` helpers — keeping them in this
// codemod lets the runner skip the chai-codemod second-pass for files that
// only need testUtils + vitest imports.
// ---------------------------------------------------------------------------

const VITEST_IMPORT_RE = /from\s+['"]vitest['"]/;
const VITEST_IMPORT_LINE =
  "import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';\n";
const HELPERS_IMPORT_RE = /from\s+['"]@helpers\/check-helpers['"]/;
const HELPERS_IMPORT_LINE =
  "import { axe } from '@helpers/check-helpers';\n";

/** Add `import { describe, it, expect, ... } from 'vitest'` if needed. */
export function ensureVitestImport(source: string): string {
  if (VITEST_IMPORT_RE.test(source)) return source;
  if (
    !/\b(?:describe|it|expect|beforeAll|beforeEach|afterAll|afterEach|vi)\b/.test(
      source
    )
  ) {
    return source;
  }
  return VITEST_IMPORT_LINE + source;
}

/** Add `import { axe } from '@helpers/check-helpers'` when the file uses `axe.X`. */
export function ensureHelpersAxeImport(source: string): string {
  if (HELPERS_IMPORT_RE.test(source)) return source;
  if (!/\baxe\./.test(source)) return source;
  return HELPERS_IMPORT_LINE + source;
}

// ---------------------------------------------------------------------------
// CLI entry point — invoked by `scripts/run-test-utils-migration.mjs`. Mirrors
// the chai codemod's CLI shape: read a file, rewrite in place (unless
// `--check`), echo a summary.
// ---------------------------------------------------------------------------

interface CliArgs {
  readonly files: readonly string[];
  readonly check: boolean;
  readonly emitSkip: boolean;
}

function parseCliArgs(argv: readonly string[]): CliArgs {
  const files: string[] = [];
  let check = false;
  let emitSkip = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) continue;
    if (a === "--check") {
      check = true;
    } else if (a === "--emit-skip") {
      // When set, a skipped file exits with code 2 and writes the skip reason
      // to stdout on a single line `SKIP: <reason>`. The runner script reads
      // that to know whether to keep the `.todo` extension and stamp a refined
      // FIXME header.
      emitSkip = true;
    } else if (a === "--from-file") {
      const f = argv[i + 1];
      if (!f) throw new Error("Missing value for --from-file");
      i++;
      files.push(`@listfile:${f}`);
    } else {
      files.push(a);
    }
  }
  if (files.length === 0) {
    throw new Error(
      "Usage: migrate-test-utils-destructure [--check] [--emit-skip] <file...> | --from-file <list>"
    );
  }
  return { files, check, emitSkip };
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const { files, check, emitSkip } = parseCliArgs(argv);

  const expanded: string[] = [];
  for (const f of files) {
    if (f.startsWith("@listfile:")) {
      const list = await fs.readFile(f.slice(10), "utf8");
      for (const line of list.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) expanded.push(trimmed);
      }
    } else {
      expanded.push(f);
    }
  }

  let touched = 0;
  let skipped = 0;
  let totalRewrites = 0;
  let exitCode = 0;

  for (const file of expanded) {
    const abs = path.resolve(file);
    let content: string;
    try {
      content = await fs.readFile(abs, "utf8");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `migrate-test-utils-destructure: cannot read ${abs}: ${(err as Error).message}`
      );
      continue;
    }

    let result: MigrateTestUtilsResult;
    try {
      result = migrateTestUtilsDestructure(content);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `migrate-test-utils-destructure: failed on ${abs}: ${(err as Error).message?.split("\n")[0]}`
      );
      continue;
    }

    if (result.skipped) {
      skipped++;
      if (emitSkip) {
        // Single-line machine-readable signal for the runner.
        // eslint-disable-next-line no-console
        console.log(`SKIP: ${result.skipReason}`);
        exitCode = 2;
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `skip: ${abs} (${result.skipReason})`
        );
      }
      continue;
    }

    totalRewrites += result.rewrites;
    if (result.source !== content) {
      touched++;
      if (!check) {
        await fs.writeFile(abs, result.source, "utf8");
      }
      // eslint-disable-next-line no-console
      console.log(
        `${check ? "would-rewrite" : "rewrote"}: ${abs} (${result.rewrites} rewrite${
          result.rewrites === 1 ? "" : "s"
        }, +${result.addedImports.length} import${
          result.addedImports.length === 1 ? "" : "s"
        })`
      );
    }
  }

  if (!emitSkip) {
    // eslint-disable-next-line no-console
    console.log(
      `\nmigrate-test-utils-destructure: ${touched}/${expanded.length} files touched, ${totalRewrites} rewrite(s), ${skipped} skipped.`
    );
  }
  return exitCode;
}

if (
  typeof process !== "undefined" &&
  typeof import.meta.url === "string" &&
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href
) {
  runCli(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    }
  );
}

