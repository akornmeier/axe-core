/**
 * migrate-module-scope-fixture.ts
 *
 * Phase 3 Sprint 4b — Task #2 of the remaining-work brief.
 *
 * Rewrites legacy Karma-style test files where `fixture` is captured at the
 * top of a `describe` block via `document.getElementById('fixture')` /
 * `document.querySelector('#fixture')` into the per-test `beforeEach` shape
 * Vitest needs. Karma evaluated the `describe` body once at module load
 * (after the fixture div was injected by index.html); Vitest evaluates the
 * same body inside the workerised browser harness BEFORE the fixture div
 * exists, so the legacy capture returns `null` and every test in the block
 * blows up with `Cannot set properties of null (setting 'innerHTML')`.
 *
 * Conversion shape:
 *
 *   describe('foo', () => {
 *     const fixture = document.querySelector('#fixture');
 *
 *     it('does X', () => { fixture.innerHTML = '...'; });
 *   });
 *
 *   →
 *
 *   describe('foo', () => {
 *     let fixture: HTMLElement;
 *     beforeEach(() => {
 *       fixture = document.getElementById('fixture') as HTMLElement;
 *     });
 *
 *     it('does X', () => { fixture.innerHTML = '...'; });
 *   });
 *
 * The capture binding may be `var | let | const`. Source can be either
 * `document.querySelector('#fixture')` or `document.getElementById('fixture')`
 * — both normalize to `document.getElementById('fixture')` in the rewrite,
 * matching the canonical `aria-busy.test.ts` shape.
 *
 * If a `beforeEach(...)` already exists inside the same describe block, the
 * fixture assignment is prepended into its arrow-function / function-body
 * rather than emitting a new `beforeEach`. The codemod always emits a fresh
 * `let fixture: HTMLElement;` at the top of the describe block — except when
 * the block already declares one (idempotency).
 *
 * Destructured forms (`const { fixture } = ...`) are intentionally left
 * alone with a warning — they're vanishingly rare in the candidate set and
 * the rewrite shape is ambiguous.
 *
 * The codemod is built on ts-morph rather than regex so we can:
 *   • Distinguish the immediate-parent describe from outer describes (only
 *     the immediate parent gets the rewrite — the outer one shouldn't pick
 *     up a stray fixture wiring).
 *   • Detect existing `let fixture: HTMLElement;` declarations and skip
 *     idempotently.
 *   • Merge the assignment into an arbitrary existing `beforeEach` body
 *     without disturbing surrounding statements.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  Project,
  SyntaxKind,
  type ArrowFunction,
  type Block,
  type CallExpression,
  type FunctionExpression,
  type SourceFile,
  type VariableStatement,
} from "ts-morph";

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface MigrateFixtureResult {
  readonly source: string;
  readonly warnings: readonly string[];
  readonly rewriteCount: number;
}

const FIXTURE_DECL_TEXT = "let fixture: HTMLElement;";
const FIXTURE_ASSIGN_TEXT =
  "fixture = document.getElementById('fixture') as HTMLElement;";
const BEFORE_EACH_BLOCK = `beforeEach(() => {\n    ${FIXTURE_ASSIGN_TEXT}\n  });`;

const FIXME_FIXTURE_RE =
  /^\/\/\s*FIXME\(phase-3-sprint-4b\):\s*codemod blocker\s*[—-]\s*fixture lookup at module top level[^\n]*\n/;

/**
 * Strip the fixture-lookup FIXME header. The runner script does this too,
 * but we apply it here so the in-process codemod is idempotent regardless
 * of whether the caller pre-strips the line.
 */
export function stripFixtureFixme(source: string): string {
  return source.replace(FIXME_FIXTURE_RE, "");
}

// ---------------------------------------------------------------------------
// Vitest import injection — extends an existing `from 'vitest'` import with
// `beforeEach`, or adds a fresh import if none exists. Mirrors the helper in
// migrate-chai-assert-to-vitest.ts but is scoped to the single name we need.
// ---------------------------------------------------------------------------

export function ensureBeforeEachImport(source: string): string {
  // Already imports beforeEach from vitest? No-op.
  if (
    /import\s*\{[^}]*\bbeforeEach\b[^}]*\}\s*from\s*['"]vitest['"]/.test(source)
  ) {
    return source;
  }

  // Existing vitest import without beforeEach — extend the named-imports
  // list. We touch only the FIRST matching import; multiple vitest imports
  // are not idiomatic and the codemod's job is to leave the rest alone.
  const existing = source.match(
    /import\s*\{([^}]*)\}\s*from\s*['"]vitest['"]/
  );
  if (existing && typeof existing.index === "number") {
    const inner = existing[1] ?? "";
    const names = inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.includes("beforeEach")) {
      names.push("beforeEach");
      names.sort();
    }
    const replacement = `import { ${names.join(", ")} } from 'vitest'`;
    return (
      source.slice(0, existing.index) +
      replacement +
      source.slice(existing.index + existing[0].length)
    );
  }

  // No vitest import at all — only inject one when the file actually
  // references vitest APIs (avoids polluting non-test modules). The
  // candidate set is `.test.ts.todo` files so this is always satisfied,
  // but the guard keeps the helper safe for unit-test snippets.
  const commonApis = [
    "describe",
    "it",
    "expect",
    "beforeEach",
    "afterEach",
    "beforeAll",
    "afterAll",
    "vi",
  ];
  const referenced: string[] = [];
  for (const api of commonApis) {
    const re = new RegExp(`\\b${api}\\s*[.(]`);
    if (re.test(source)) referenced.push(api);
  }
  if (referenced.length === 0) return source;
  // Always include beforeEach since callers extend an import for code that
  // just had a beforeEach inserted; otherwise re-walking the source to find
  // the inserted beforeEach is redundant.
  if (!referenced.includes("beforeEach")) referenced.push("beforeEach");
  referenced.sort();
  return `import { ${referenced.join(", ")} } from 'vitest';\n${source}`;
}

// ---------------------------------------------------------------------------
// AST analysis helpers.
// ---------------------------------------------------------------------------

/**
 * Return true if the given call expression is `describe(...)` /
 * `describe.only(...)` / `describe.skip(...)`. We don't try to resolve
 * the binding — relying on identifier-text is sufficient for our codebase.
 */
function isDescribeCall(call: CallExpression): boolean {
  const expr = call.getExpression();
  const k = expr.getKind();
  if (k === SyntaxKind.Identifier) {
    return expr.getText() === "describe";
  }
  if (k === SyntaxKind.PropertyAccessExpression) {
    const pa = expr.asKind(SyntaxKind.PropertyAccessExpression);
    if (!pa) return false;
    const inner = pa.getExpression();
    return (
      inner.getKind() === SyntaxKind.Identifier &&
      inner.getText() === "describe"
    );
  }
  return false;
}

/** Return the body block of a describe call's callback, or null. */
function getDescribeBody(call: CallExpression): Block | null {
  const args = call.getArguments();
  if (args.length < 2) return null;
  const cb = args[1];
  if (!cb) return null;
  const k = cb.getKind();
  if (k === SyntaxKind.ArrowFunction) {
    const body = (cb as ArrowFunction).getBody();
    if (body.getKind() === SyntaxKind.Block) return body as Block;
    return null;
  }
  if (k === SyntaxKind.FunctionExpression) {
    const fnBody = (cb as FunctionExpression).getBody();
    if (fnBody && fnBody.getKind() === SyntaxKind.Block) {
      return fnBody as Block;
    }
    return null;
  }
  return null;
}

/**
 * Match a fixture capture pattern as the IMMEDIATE child of `block`:
 *   var|let|const fixture = document.getElementById('fixture');
 *   var|let|const fixture = document.querySelector('#fixture');
 *
 * Returns the variable statement node when the pattern matches.
 */
function findModuleScopeFixtureDecl(block: Block): VariableStatement | null {
  for (const stmt of block.getStatements()) {
    if (stmt.getKind() !== SyntaxKind.VariableStatement) continue;
    const varStmt = stmt as VariableStatement;
    const decls = varStmt.getDeclarations();
    if (decls.length !== 1) continue;
    const decl = decls[0];
    if (!decl) continue;
    const nameNode = decl.getNameNode();
    if (
      nameNode.getKind() !== SyntaxKind.Identifier ||
      nameNode.getText() !== "fixture"
    ) {
      continue;
    }
    const init = decl.getInitializer();
    if (!init) continue;
    if (init.getKind() !== SyntaxKind.CallExpression) continue;
    const call = init as CallExpression;
    const expr = call.getExpression();
    if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) continue;
    const pa = expr.asKind(SyntaxKind.PropertyAccessExpression);
    if (!pa) continue;
    const obj = pa.getExpression();
    if (
      obj.getKind() !== SyntaxKind.Identifier ||
      obj.getText() !== "document"
    ) {
      continue;
    }
    const methodName = pa.getName();
    if (methodName !== "getElementById" && methodName !== "querySelector") {
      continue;
    }
    const args = call.getArguments();
    if (args.length !== 1) continue;
    const arg = args[0];
    if (!arg) continue;
    const argText = arg.getText();
    if (
      argText !== "'fixture'" &&
      argText !== '"fixture"' &&
      argText !== "'#fixture'" &&
      argText !== '"#fixture"'
    ) {
      continue;
    }
    return varStmt;
  }
  return null;
}

/**
 * Idempotency check: does the block already declare `let fixture: HTMLElement;`
 * (or any other `fixture` declaration paired with an assignment in beforeEach)?
 * We only need to detect the canonical post-codemod shape.
 */
function hasMigratedFixtureDecl(block: Block): boolean {
  for (const stmt of block.getStatements()) {
    if (stmt.getKind() !== SyntaxKind.VariableStatement) continue;
    const varStmt = stmt as VariableStatement;
    if (varStmt.getDeclarationKind() !== "let") continue;
    const decls = varStmt.getDeclarations();
    if (decls.length !== 1) continue;
    const decl = decls[0];
    if (!decl) continue;
    const nameNode = decl.getNameNode();
    if (
      nameNode.getKind() !== SyntaxKind.Identifier ||
      nameNode.getText() !== "fixture"
    ) {
      continue;
    }
    if (decl.getInitializer()) continue; // post-codemod shape has no init
    return true;
  }
  return false;
}

/**
 * Find the first `beforeEach(...)` call expression that is a direct child of
 * the describe block (i.e. `beforeEach` invoked at the top level of the
 * describe). Returns null if none found.
 */
function findDirectBeforeEach(block: Block): CallExpression | null {
  for (const stmt of block.getStatements()) {
    if (stmt.getKind() !== SyntaxKind.ExpressionStatement) continue;
    const exprStmt = stmt.asKind(SyntaxKind.ExpressionStatement);
    if (!exprStmt) continue;
    const expr = exprStmt.getExpression();
    if (expr.getKind() !== SyntaxKind.CallExpression) continue;
    const call = expr as CallExpression;
    const callee = call.getExpression();
    if (
      callee.getKind() === SyntaxKind.Identifier &&
      callee.getText() === "beforeEach"
    ) {
      return call;
    }
  }
  return null;
}

/**
 * Detect destructured fixture-from-something patterns we won't rewrite:
 *   const { fixture } = something;
 * Emit a warning instead of touching them.
 */
function findDestructuredFixture(block: Block): VariableStatement | null {
  for (const stmt of block.getStatements()) {
    if (stmt.getKind() !== SyntaxKind.VariableStatement) continue;
    const varStmt = stmt as VariableStatement;
    const decls = varStmt.getDeclarations();
    for (const decl of decls) {
      const nameNode = decl.getNameNode();
      if (nameNode.getKind() !== SyntaxKind.ObjectBindingPattern) continue;
      const obp = nameNode.asKind(SyntaxKind.ObjectBindingPattern);
      if (!obp) continue;
      for (const elem of obp.getElements()) {
        const propName = elem.getNameNode().getText();
        if (propName === "fixture") {
          return varStmt;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rewrite logic.
// ---------------------------------------------------------------------------

/**
 * Prepend the fixture-assignment line to an existing beforeEach callback
 * body. Returns true if the prepend succeeded.
 */
function prependFixtureToBeforeEach(call: CallExpression): boolean {
  const args = call.getArguments();
  if (args.length === 0) return false;
  const cb = args[0];
  if (!cb) return false;
  const k = cb.getKind();
  let body: Block | null = null;
  if (k === SyntaxKind.ArrowFunction) {
    const arrow = cb as ArrowFunction;
    const arrowBody = arrow.getBody();
    if (arrowBody.getKind() === SyntaxKind.Block) {
      body = arrowBody as Block;
    } else {
      // Concise body — wrap in a block. ts-morph doesn't expose a single-shot
      // helper, so we replace the body source manually.
      const exprText = arrowBody.getText();
      arrow.setBodyText(`${FIXTURE_ASSIGN_TEXT}\nreturn (${exprText});`);
      return true;
    }
  } else if (k === SyntaxKind.FunctionExpression) {
    const fnBody = (cb as FunctionExpression).getBody();
    if (fnBody && fnBody.getKind() === SyntaxKind.Block) {
      body = fnBody as Block;
    }
  }
  if (!body) return false;

  // Skip if the existing body already starts with our assignment
  // (idempotency on a prior partial run).
  const firstStmt = body.getStatements()[0];
  if (firstStmt && firstStmt.getText().includes(FIXTURE_ASSIGN_TEXT)) {
    return true;
  }

  body.insertStatements(0, FIXTURE_ASSIGN_TEXT);
  return true;
}

/**
 * Process a single describe block: detect & remove the legacy fixture
 * declaration, inject the per-test wiring. Returns true iff the block was
 * mutated.
 */
function processDescribeBlock(
  block: Block,
  warnings: string[]
): boolean {
  // Idempotency — already migrated.
  if (hasMigratedFixtureDecl(block)) return false;

  // Destructure form — warn & skip.
  const destructured = findDestructuredFixture(block);
  if (destructured) {
    warnings.push(
      `destructured fixture binding at line ${destructured.getStartLineNumber()} — left untouched`
    );
    return false;
  }

  const decl = findModuleScopeFixtureDecl(block);
  if (!decl) return false;

  // Capture position of the legacy declaration so we can insert the new
  // wiring at the same spot, then remove the old node.
  const declIndex = block
    .getStatements()
    .findIndex((s) => s === decl);
  decl.remove();

  // Existing beforeEach? Prepend the assignment to it.
  const existing = findDirectBeforeEach(block);
  if (existing) {
    prependFixtureToBeforeEach(existing);
    // Inject just the `let` declaration where the legacy capture used to be.
    block.insertStatements(declIndex, FIXTURE_DECL_TEXT);
    return true;
  }

  // No existing beforeEach — emit both the declaration and a fresh
  // beforeEach block.
  block.insertStatements(declIndex, [FIXTURE_DECL_TEXT, BEFORE_EACH_BLOCK]);
  return true;
}

/**
 * Walk every describe call in the source file and rewrite the immediate
 * block when it captures `fixture` at module scope. Nested describes are
 * processed independently — each describe's IMMEDIATE block is the one we
 * inspect for the fixture pattern; an outer describe with no direct fixture
 * capture stays untouched even when one of its inner describes does the
 * capture.
 */
function rewriteFile(sourceFile: SourceFile): MigrateFixtureResult {
  const warnings: string[] = [];
  let rewriteCount = 0;

  // Re-walk after each rewrite — block.insertStatements/remove invalidates
  // our cached node list.
  for (let pass = 0; pass < 100; pass++) {
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    let madeChange = false;
    for (const call of calls) {
      if (call.wasForgotten()) continue;
      if (!isDescribeCall(call)) continue;
      const body = getDescribeBody(call);
      if (!body) continue;
      try {
        if (processDescribeBlock(body, warnings)) {
          rewriteCount++;
          madeChange = true;
          break;
        }
      } catch (err) {
        const lineNo = call.wasForgotten()
          ? "?"
          : String(call.getStartLineNumber());
        warnings.push(
          `ts-morph rewrite failed at line ${lineNo}: ${(err as Error).message?.split("\n")[0]}`
        );
      }
    }
    if (!madeChange) break;
  }

  return {
    source: sourceFile.getFullText(),
    warnings,
    rewriteCount,
  };
}

// ---------------------------------------------------------------------------
// Top-level orchestration.
// ---------------------------------------------------------------------------

export function migrateModuleScopeFixture(content: string): MigrateFixtureResult {
  // 1. Strip the FIXME header (the runner does this too, but make the codemod
  //    safe to re-run on a partially-stripped file).
  const headerStripped = stripFixtureFixme(content);

  // 2. Run the AST rewrite.
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      target: 99,
      module: 99,
    },
  });
  const sourceFile = project.createSourceFile(
    "__fixture-migration__.ts",
    headerStripped,
    { overwrite: true }
  );
  const rewritten = rewriteFile(sourceFile);

  // 3. Inject `beforeEach` into the vitest import set if the rewrite touched
  //    anything. If we didn't rewrite, leave the imports alone — running
  //    twice on a non-target file should produce no diff.
  const finalSource =
    rewritten.rewriteCount > 0
      ? ensureBeforeEachImport(rewritten.source)
      : rewritten.source;

  return { ...rewritten, source: finalSource };
}

/** Convenience wrapper returning only the rewritten source. */
export function migrateModuleScopeFixtureSource(content: string): string {
  return migrateModuleScopeFixture(content).source;
}

// Exports kept for completeness — used by the unit tests directly.
export {
  findModuleScopeFixtureDecl,
  hasMigratedFixtureDecl,
  findDirectBeforeEach,
  findDestructuredFixture,
};

// Re-export AST helpers via a thin wrapper for tests that operate on raw
// source — the unit-test file uses `migrateModuleScopeFixture(source)` and
// the helpers above are exercised transitively. The named exports stay so
// future codemods can compose them.
//
// (No-op block — kept for documentation. ts-morph helpers don't reach
// outside the in-memory project, so they're safe to re-export.)

// ---------------------------------------------------------------------------
// CLI entry point.
// ---------------------------------------------------------------------------

interface CliArgs {
  readonly files: readonly string[];
  readonly check: boolean;
}

function parseCliArgs(argv: readonly string[]): CliArgs {
  const files: string[] = [];
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) continue;
    if (a === "--check") {
      check = true;
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
      "Usage: migrate-module-scope-fixture [--check] <file...> | --from-file <list>"
    );
  }
  return { files, check };
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const { files, check } = parseCliArgs(argv);

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

  let totalRewrites = 0;
  let touched = 0;

  for (const file of expanded) {
    const abs = path.resolve(file);
    let content: string;
    try {
      content = await fs.readFile(abs, "utf8");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `migrate-module-scope-fixture: cannot read ${abs}: ${(err as Error).message}`
      );
      continue;
    }
    let result: MigrateFixtureResult;
    try {
      result = migrateModuleScopeFixture(content);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `migrate-module-scope-fixture: failed on ${abs}: ${(err as Error).message?.split("\n")[0]}`
      );
      continue;
    }
    totalRewrites += result.rewriteCount;
    if (result.source !== content) {
      touched++;
      if (!check) {
        await fs.writeFile(abs, result.source, "utf8");
      }
      // eslint-disable-next-line no-console
      console.log(
        `${check ? "would-rewrite" : "rewrote"}: ${abs} (${result.rewriteCount} block${result.rewriteCount === 1 ? "" : "s"})`
      );
    }
    for (const w of result.warnings) {
      // eslint-disable-next-line no-console
      console.warn(`  warn (${path.basename(abs)}): ${w}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `\nmigrate-module-scope-fixture: ${touched}/${expanded.length} files touched, ${totalRewrites} describe block(s) rewritten.`
  );
  return 0;
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
