/**
 * migrate-axe-tree-to-flat-tree-setup.ts
 *
 * Sprint 4b follow-up codemod. Rewrites tests that mutate `axe._tree`
 * directly into the per-test fixture lifecycle exposed by
 * `@helpers/check-helpers`'s `flatTreeSetup` helper.
 *
 * The original Sprint 4b codemod stamped any test that contained the literal
 * `axe._tree = …` assignment with a `// FIXME(phase-3-sprint-4b): codemod
 * blocker — uses axe._tree (internal state)` header and bumped it to
 * `.test.ts.todo`. There are 42 such files. The transformation needed to
 * unblock them is mechanical:
 *
 *   axe._tree = axe.utils.getFlattenedTree(node);
 *     → flatTreeSetup(node);
 *
 *   const tree = (axe._tree = axe.utils.getFlattenedTree(node));
 *     → const tree = flatTreeSetup(node);
 *
 *   treeRoot = axe._tree = axe.utils.getFlattenedTree(node);
 *     → treeRoot = flatTreeSetup(node);
 *
 *   var getFlattenedTree = axe.utils.getFlattenedTree;
 *   ...
 *   axe._tree = getFlattenedTree(node);
 *     → import { flatTreeSetup } from '@helpers/check-helpers';
 *       (variable destructure dropped)
 *       flatTreeSetup(node);
 *
 *   axe._tree = [vNode];                    // intentionally NOT rewritten —
 *   axe._tree = undefined;                  // these reset/seed cases are not
 *   axe._tree = null;                       // expressible via flatTreeSetup
 *
 * After rewriting, the codemod ensures `flatTreeSetup` is imported from
 * `@helpers/check-helpers` (merging with any existing import from that
 * module, or adding a fresh one at the top of the file).
 *
 * IMPORTANT — out of scope:
 *   1. We do NOT migrate tests off `axe.testUtils.*` globals. Many of these
 *      files still pass because the UMD bundle re-exports `axe`, and the
 *      legacy testUtils shim is loaded by the karma harness. Vitest tests
 *      lose `axe.testUtils.*` — that residual is a separate cleanup.
 *   2. We do NOT touch `axe._tree` reads. They keep working as long as
 *      something has populated `axe._tree`, which `flatTreeSetup` does.
 *   3. We do NOT strip the `// FIXME(phase-3-sprint-4b): …` header — the
 *      runner script handles that, then runs the codemod, then renames the
 *      file to `.test.ts`. Files that still fail at runtime get reverted to
 *      `.todo` with an updated header.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELPERS_MODULE = '@helpers/check-helpers';
const FLAT_TREE_SETUP = 'flatTreeSetup';

export interface MigrateResult {
  readonly source: string;
  /** Number of `axe._tree =` assignments rewritten. */
  readonly rewrites: number;
  /** True iff a new `import { flatTreeSetup } from '@helpers/...'` was added or merged. */
  readonly importAdded: boolean;
  /** Warnings that the migrator should review by hand. */
  readonly warnings: readonly string[];
}

/**
 * Strip a `var <name> = axe.utils.getFlattenedTree;` / equivalent
 * `let|const` destructure-style declaration. The codemod emits direct
 * `flatTreeSetup` calls instead, so the local binding is dead.
 *
 * Returns `{ source, removedNames }`. `removedNames` is used by the call-site
 * rewriter to translate `<name>(node)` calls back into `flatTreeSetup(node)`.
 */
function stripDestructuredGetFlattenedTree(source: string): {
  source: string;
  removedNames: Set<string>;
} {
  const removed = new Set<string>();
  // Match `var foo = axe.utils.getFlattenedTree;` (also `let`, `const`),
  // optionally followed by `;` and a trailing newline. We anchor to a line
  // start to avoid eating intra-line tokens.
  const pattern =
    /^[ \t]*(?:var|let|const)\s+(\w+)\s*=\s*axe\.utils\.getFlattenedTree\s*;?\s*\n/gm;
  const out = source.replace(pattern, (_match, name: string) => {
    removed.add(name);
    return '';
  });
  return { source: out, removedNames: removed };
}

/**
 * Rewrite all `axe._tree = …getFlattenedTree(…)` forms, plus calls to a
 * destructured local binding for `getFlattenedTree`, to use `flatTreeSetup`.
 *
 * Order matters: the parenthesised-init form
 * `const x = (axe._tree = axe.utils.getFlattenedTree(y));` is handled before
 * the bare `axe._tree = axe.utils.getFlattenedTree(y);` form so the regex for
 * the latter does not eat the inner half of the former.
 */
function rewriteAssignments(
  source: string,
  destructuredNames: ReadonlySet<string>
): { source: string; rewrites: number } {
  let count = 0;
  let out = source;

  // -- 1. Parenthesised init: `(axe._tree = axe.utils.getFlattenedTree(ARG))`
  //    The argument may itself contain parens (rare, but defensive). We use
  //    a lazy match against the inner `( … )` and rely on the surrounding
  //    `(axe._tree = …)` parens to delimit it.
  out = out.replace(
    /\(\s*axe\._tree\s*=\s*axe\.utils\.getFlattenedTree\(([^)]*?)\)\s*\)/g,
    (_match, arg: string) => {
      count++;
      return `${FLAT_TREE_SETUP}(${arg.trim()})`;
    }
  );

  // Same shape but using a destructured local binding.
  if (destructuredNames.size > 0) {
    const altNames = [...destructuredNames]
      .map(escapeRegex)
      .join('|');
    const parenAlt = new RegExp(
      `\\(\\s*axe\\._tree\\s*=\\s*(?:${altNames})\\(([^)]*?)\\)\\s*\\)`,
      'g'
    );
    out = out.replace(parenAlt, (_match, arg: string) => {
      count++;
      return `${FLAT_TREE_SETUP}(${arg.trim()})`;
    });
  }

  // -- 2. Bare assignment: `axe._tree = axe.utils.getFlattenedTree(ARG);`
  out = out.replace(
    /axe\._tree\s*=\s*axe\.utils\.getFlattenedTree\(([^)]*?)\)/g,
    (_match, arg: string) => {
      count++;
      return `${FLAT_TREE_SETUP}(${arg.trim()})`;
    }
  );

  if (destructuredNames.size > 0) {
    const altNames = [...destructuredNames]
      .map(escapeRegex)
      .join('|');
    const bareAlt = new RegExp(
      `axe\\._tree\\s*=\\s*(?:${altNames})\\(([^)]*?)\\)`,
      'g'
    );
    out = out.replace(bareAlt, (_match, arg: string) => {
      count++;
      return `${FLAT_TREE_SETUP}(${arg.trim()})`;
    });
  }

  return { source: out, rewrites: count };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Merge a list of named imports into an existing `import { … } from '<mod>'`
 * statement, or insert a fresh import line. Returns `{ source, added }` —
 * `added` is true iff the source was modified.
 *
 * `names` are merged in-order; duplicates against the existing list are
 * skipped. The function is idempotent: every name already in the existing
 * import is treated as a no-op.
 */
function ensureNamedImport(
  source: string,
  moduleId: string,
  names: readonly string[]
): { source: string; added: boolean } {
  const escaped = escapeRegex(moduleId);

  // 1. Find an existing `import { … } from '<moduleId>'`.
  const existingImport = new RegExp(
    `(import\\s*\\{)([^}]+)(\\}\\s*from\\s*['"]${escaped}['"])`
  );
  const matched = source.match(existingImport);
  if (matched) {
    const existingNames = String(matched[2])
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    const existingSet = new Set(existingNames);
    const toAdd = names.filter((n) => !existingSet.has(n));
    if (toAdd.length === 0) {
      return { source, added: false };
    }
    const merged = [...existingNames, ...toAdd];
    const replaced = source.replace(
      existingImport,
      (_m, head, _n, tail) => `${head} ${merged.join(', ')} ${tail}`
    );
    return { source: replaced, added: true };
  }

  // 2. No existing import — insert a fresh one. Place it after any leading
  //    file-level comment block (so we don't shove it above a copyright /
  //    FIXME header) and after any other `import` statements.
  const lines = source.split('\n');
  let insertAt = 0;

  // Skip leading blank lines and `//` / `/* … */` comment blocks at the top
  // of the file.
  while (insertAt < lines.length) {
    const line = lines[insertAt] ?? '';
    const trimmed = line.trim();
    if (trimmed === '') {
      insertAt++;
      continue;
    }
    if (trimmed.startsWith('//')) {
      insertAt++;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      // Walk to end of block comment.
      while (
        insertAt < lines.length &&
        !(lines[insertAt] ?? '').includes('*/')
      ) {
        insertAt++;
      }
      insertAt++; // consume the closing line
      continue;
    }
    break;
  }

  // Then skip past any existing import lines so the new import joins them.
  while (insertAt < lines.length) {
    const trimmed = (lines[insertAt] ?? '').trim();
    if (trimmed.startsWith('import ') || trimmed === '') {
      insertAt++;
      continue;
    }
    break;
  }

  const importLine = `import { ${names.join(', ')} } from '${moduleId}';`;
  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  const out = [...before, importLine, ...after];
  return { source: out.join('\n'), added: true };
}

/**
 * Rewrite the legacy describe-scope `fixture` handle so it works under
 * Vitest's per-test fixture lifecycle.
 *
 * Legacy shape (Karma — `<div id="fixture">` is on the page once at boot):
 *
 *   describe('foo', function () {
 *     var fixture = document.getElementById('fixture');
 *     ...
 *   });
 *
 * Vitest shape (per-test fixture, set in `beforeEach` by `vitest.setup.ts`):
 *
 *   describe('foo', () => {
 *     let fixture;
 *     beforeEach(() => {
 *       fixture = document.getElementById('fixture');
 *     });
 *     ...
 *   });
 *
 * The legacy form fails immediately because the describe-scope statement
 * runs before any `beforeEach` hook. The codemod restructures the very
 * first occurrence of that exact pattern inside a `describe(…)` callback.
 *
 * This is a narrow, opinionated rewrite — only the canonical
 * `var fixture = document.getElementById('fixture');` line gets touched.
 * Anything more elaborate (custom IDs, casts, conditional fallback) is
 * left for manual cleanup.
 *
 * Returns `{ source, rewrote }`.
 */
function rewriteFixtureHandle(source: string): {
  source: string;
  rewrote: boolean;
} {
  const pattern =
    /^([ \t]*)(?:var|let|const)\s+fixture\s*=\s*document\.getElementById\(\s*['"]fixture['"]\s*\)\s*;?\s*\n/gm;
  let rewrote = false;
  const out = source.replace(pattern, (_match, indent: string) => {
    rewrote = true;
    return (
      `${indent}let fixture: HTMLElement;\n` +
      `${indent}beforeEach(() => {\n` +
      `${indent}  fixture = document.getElementById('fixture') as HTMLElement;\n` +
      `${indent}});\n`
    );
  });
  return { source: out, rewrote };
}

/**
 * Run the codemod on a single file's text. Pure function so unit tests can
 * exercise it without filesystem I/O.
 */
export function migrateSource(source: string): MigrateResult {
  const warnings: string[] = [];

  const { source: stripped, removedNames } =
    stripDestructuredGetFlattenedTree(source);
  const { source: assignmentsRewritten, rewrites } = rewriteAssignments(
    stripped,
    removedNames
  );
  const { source: rewritten, rewrote: fixtureRewrote } =
    rewriteFixtureHandle(assignmentsRewritten);
  if (fixtureRewrote) {
    warnings.push(
      'rewrote `var fixture = document.getElementById("fixture")` to a `let` + `beforeEach` shape; review for any captured-closure assumptions in the surrounding describe block'
    );
  }

  if (rewrites === 0) {
    // Nothing to rewrite — return the input unchanged. This is fine for
    // files where the only `axe._tree` reference is a read, e.g.
    // `axe.utils.querySelectorAll(axe._tree[0], …)`. Those reads continue
    // to work because some other helper (e.g. `fixtureSetup`) populates
    // `axe._tree` for them.
    warnings.push(
      'no axe._tree=getFlattenedTree(…) assignments matched — file may rely on axe.testUtils.fixtureSetup or similar to seed axe._tree'
    );
  }

  // Guard against shapes we know we can't safely rewrite.
  const literalSeeds = source.match(
    /axe\._tree\s*=\s*(?:undefined|null|\[)/g
  );
  if (literalSeeds && literalSeeds.length > 0) {
    warnings.push(
      `${literalSeeds.length} axe._tree literal-seed assignment(s) (\`= undefined\` / \`= null\` / \`= [vNode]\`) left in place — these are reset / handcrafted vtree cases that flatTreeSetup does not cover`
    );
  }

  // Add the necessary imports to make the file Vitest-runnable. The codemod
  // is invoked deliberately on `.test.ts.todo` files that need migration —
  // even files where every `axe._tree` reference is a READ still need the
  // top-of-file imports (the legacy Karma tests rely on `describe`/`it`/etc.
  // as ambient globals, but the Vitest browser project does NOT enable
  // `globals: true`).
  let finalSource = rewritten;
  let importAdded = false;

  // Helpers import — `axe` (always — every legacy test references it) and
  // `flatTreeSetup` (only if we actually rewrote a call site, since adding
  // an unused import would be a lint regression on the very few files where
  // every `axe._tree` use is a read).
  const helperNames: string[] = [];
  if (/\baxe\b/.test(rewritten)) helperNames.push('axe');
  if (rewrites > 0 || /\bflatTreeSetup\s*\(/.test(rewritten)) {
    helperNames.push(FLAT_TREE_SETUP);
  }
  if (helperNames.length > 0) {
    const helperResult = ensureNamedImport(
      finalSource,
      HELPERS_MODULE,
      helperNames
    );
    finalSource = helperResult.source;
    importAdded = importAdded || helperResult.added;
  }

  // Vitest globals — add for any bare identifier that's used as a function
  // call or property access in the file.
  const vitestNames = detectVitestGlobals(finalSource);
  if (vitestNames.length > 0) {
    const vitestResult = ensureNamedImport(
      finalSource,
      'vitest',
      vitestNames
    );
    finalSource = vitestResult.source;
    importAdded = importAdded || vitestResult.added;
  }

  return { source: finalSource, rewrites, importAdded, warnings };
}

/**
 * Return the list of Vitest globals (`describe`, `it`, etc.) that are
 * referenced as bare identifiers in `source`. The browser project does not
 * enable `globals: true`, so each used global needs an explicit import.
 */
function detectVitestGlobals(source: string): string[] {
  const candidates = [
    'describe',
    'it',
    'xit',
    'expect',
    'beforeAll',
    'beforeEach',
    'afterAll',
    'afterEach',
    'vi'
  ];
  const present: string[] = [];
  for (const name of candidates) {
    // Match `<name>(` or `<name>.` as a bare identifier. The leading
    // boundary excludes property accesses like `obj.describe(`.
    const re = new RegExp(`(?:^|[^\\w.])${name}\\s*[(.]`, 'm');
    if (re.test(source)) present.push(name);
  }
  return present;
}

/**
 * Apply the codemod to a file in place. Returns the same metadata as
 * `migrateSource`. The caller is responsible for any file rename
 * (`.test.ts.todo` → `.test.ts`) — this function only rewrites contents.
 */
export async function migrateFile(filePath: string): Promise<MigrateResult> {
  const original = await fs.readFile(filePath, 'utf8');
  const result = migrateSource(original);
  if (result.source !== original) {
    await fs.writeFile(filePath, result.source, 'utf8');
  }
  return result;
}

// ---------------------------------------------------------------------------
// CLI entry point. Usage:
//   tsx migrate-axe-tree-to-flat-tree-setup.ts <file-or-glob> [--dry-run]
// ---------------------------------------------------------------------------

interface CliArgs {
  readonly inputs: readonly string[];
  readonly dryRun: boolean;
}

function parseCliArgs(argv: readonly string[]): CliArgs {
  const inputs: string[] = [];
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    inputs.push(arg);
  }
  if (inputs.length === 0) {
    throw new Error(
      'Usage: migrate-axe-tree-to-flat-tree-setup <file-or-glob>… [--dry-run]'
    );
  }
  return { inputs, dryRun };
}

export async function runCli(argv: readonly string[]): Promise<void> {
  const { inputs, dryRun } = parseCliArgs(argv);

  // Lazy-import glob so unit-test paths that only call `migrateSource` don't
  // pay the cost.
  const { glob } = await import('glob');
  const files: string[] = [];
  for (const input of inputs) {
    if (input.includes('*') || input.includes('?')) {
      const matched = await glob(input, { absolute: true });
      files.push(...matched);
    } else {
      files.push(path.resolve(input));
    }
  }
  if (files.length === 0) {
    console.error('migrate-axe-tree-to-flat-tree-setup: no files matched');
    process.exit(1);
  }

  let totalRewrites = 0;
  const filesChanged: string[] = [];
  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    const result = migrateSource(original);
    totalRewrites += result.rewrites;
    if (result.source !== original) {
      filesChanged.push(file);
      if (!dryRun) {
        await fs.writeFile(file, result.source, 'utf8');
      }
    }
    const status = dryRun ? '[dry-run] would update' : 'updated';
    if (result.source !== original) {
      console.log(`${status}: ${file} (${result.rewrites} rewrite(s))`);
    } else {
      console.log(`unchanged: ${file}`);
    }
    for (const w of result.warnings) {
      console.warn(`  warn: ${w}`);
    }
  }
  console.log(
    `\n${filesChanged.length}/${files.length} file(s) changed; ${totalRewrites} assignment(s) rewritten.`
  );
}

if (
  typeof process !== 'undefined' &&
  typeof import.meta.url === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1] ?? '').href
) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
