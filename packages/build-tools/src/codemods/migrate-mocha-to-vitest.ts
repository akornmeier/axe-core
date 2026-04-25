/**
 * migrate-mocha-to-vitest.ts
 *
 * Two-pass hybrid codemod that rewrites Mocha + Chai + Sinon test files into
 * Vitest 4 test files. Implements the substitution table from
 * `specs/PRD-03-test-infrastructure-modernization.md` §2.3.1.
 *
 *   Pass 1 (regex / pure string): handles ~80% of mechanical assertion and
 *           spy/fake rewrites. Pure function: `string -> string`. Fast and
 *           cheap; trivially unit-testable.
 *
 *   Pass 2 (ts-morph / AST):     handles the cases where regex is unsafe —
 *           chained `sinon.stub(obj, 'method').returns(v)` calls, top-level
 *           CommonJS `require()` rewrites, and reporting any `chai.*` /
 *           `sinon.*` references that survived Pass 1.
 *
 * IMPORTANT — this codemod is a BULK-REWRITE ACCELERATOR, not a fully
 * automated rewrite. Even on a clean Pass 1 + Pass 2 run, the following
 * residual diff classes will remain and require manual cleanup:
 *
 *   1. Imports / helpers — the legacy suites rely on globals
 *      (`axe.testUtils.checkSetup`, `axe.testUtils.getCheckEvaluate`,
 *      `axe.testUtils.MockCheckContext`). The hand-migrated pilot files
 *      use named imports from `_helpers/check-helpers`. The codemod
 *      cannot infer the helper module path from a global access.
 *
 *   2. Fixture-loading strategy — the Mocha suites load fixtures via
 *      Karma `fixtures.html` and DOM mutation; the Vitest suites use
 *      Vite's `import.meta.glob` or per-test setup. This is a
 *      project-architecture choice, not a syntactic transform.
 *
 *   3. Per-test setup migration — async `done()` callbacks, Mocha's
 *      `this.timeout()`, and `before(function(done){...})` patterns are
 *      partially rewritten (we map `before -> beforeAll`) but the
 *      `done`-callback to `await/Promise` conversion is left to the
 *      author.
 *
 * The codemod should reduce the per-file migration effort from ~30 minutes
 * of mechanical typing to ~5 minutes of imports + setup cleanup. That is
 * the design goal; do not over-extend the codemod to chase the last 5%.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { Project, SyntaxKind, type CallExpression } from "ts-morph";

// ---------------------------------------------------------------------------
// Pass 1 — pure-string regex pass.
// ---------------------------------------------------------------------------

/** Each rule is `{ pattern, replacement }`, applied in order. */
interface RegexRule {
  readonly pattern: RegExp;
  readonly replacement: string | ((...args: string[]) => string);
}

/**
 * Read a balanced parenthesised expression starting at `start` (which must
 * point AT the opening `(`). Returns the index of the matching `)` (inclusive
 * of position). Handles single-quoted, double-quoted, backtick, and comment
 * sequences well enough for the codemod's needs (test files, no escapes
 * across strings).
 */
function findBalancedClose(src: string, start: number): number {
  let depth = 0;
  let i = start;
  let inString: '"' | "'" | "`" | null = null;
  while (i < src.length) {
    const ch = src[i];
    if (inString) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = ch as '"' | "'" | "`";
      i++;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * Apply a balanced-paren rewrite for assertions of the form `prefix(EXPR)`
 * where EXPR may itself contain parens. `template(expr)` returns the
 * replacement text. Used for `assert.isTrue(...)`, etc., where the regex
 * `[^)]+` form can't span nested parens.
 */
function rewriteBalanced(
  source: string,
  prefix: RegExp,
  template: (expr: string) => string
): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const remaining = source.slice(i);
    const match = remaining.match(prefix);
    if (!match || match.index === undefined) {
      out += remaining;
      break;
    }
    const matchStart = i + match.index;
    const openParen = matchStart + match[0].length - 1; // prefix ends with '('
    if (source[openParen] !== "(") {
      // Defensive: shouldn't happen, but skip if so.
      out += source.slice(i, matchStart + match[0].length);
      i = matchStart + match[0].length;
      continue;
    }
    const close = findBalancedClose(source, openParen);
    if (close === -1) {
      out += source.slice(i);
      break;
    }
    const expr = source.slice(openParen + 1, close);
    out += source.slice(i, matchStart);
    out += template(expr);
    i = close + 1;
  }
  return out;
}

/**
 * Match an `expect(...)` argument allowing one level of balanced parens.
 * Captures non-greedily up to the matching `)`. Good enough for our use
 * cases; ts-morph fixes anything Pass 1 mangles.
 */
const EXPECT_ARG = String.raw`expect\(((?:[^()]|\([^()]*\))*)\)`;

const PASS_1_RULES: readonly RegexRule[] = [
  // Strip 'use strict' directives — Vitest files are ESM modules.
  { pattern: /^\s*['"]use strict['"];?\s*\n/gm, replacement: "" },

  // Drop chai imports — Vitest provides expect via globals or named import.
  {
    pattern: /^\s*import\s+(?:\*\s+as\s+\w+|\{[^}]*\})\s+from\s+['"]chai['"];?\s*\n/gm,
    replacement: "",
  },
  {
    pattern: /^\s*const\s+\{[^}]*\}\s*=\s*require\(['"]chai['"]\);?\s*\n/gm,
    replacement: "",
  },
  {
    pattern: /^\s*const\s+\w+\s*=\s*require\(['"]chai['"]\);?\s*\n/gm,
    replacement: "",
  },

  // sinon imports → vitest `vi` import. Pass 2 will later detect leftover
  // `sinon.*` references and report them.
  {
    pattern: /^\s*import\s+(?:\*\s+as\s+)?sinon\s+from\s+['"]sinon['"];?\s*\n/gm,
    replacement: "import { vi } from 'vitest';\n",
  },
  {
    pattern: /^\s*const\s+sinon\s*=\s*require\(['"]sinon['"]\);?\s*\n/gm,
    replacement: "import { vi } from 'vitest';\n",
  },

  // Mocha lifecycle aliases.
  { pattern: /\bbefore\(/g, replacement: "beforeAll(" },
  { pattern: /\bafter\(/g, replacement: "afterAll(" },
  // `beforeEach` / `afterEach` are identical in Mocha and Vitest — no rewrite.

  // -- Chai BDD: expect(x).to.equal(y) / .to.eql / .to.deep.equal --------
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.equal\\(`, "g"),
    replacement: "expect($1).toBe(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.deep\\.equal\\(`, "g"),
    replacement: "expect($1).toEqual(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.eql\\(`, "g"),
    replacement: "expect($1).toEqual(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.not\\.equal\\(`, "g"),
    replacement: "expect($1).not.toBe(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.not\\.deep\\.equal\\(`, "g"),
    replacement: "expect($1).not.toEqual(",
  },

  // -- Boolean / nullish chai assertions --------------------------------
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.be\\.true\\b`, "g"),
    replacement: "expect($1).toBe(true)",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.be\\.false\\b`, "g"),
    replacement: "expect($1).toBe(false)",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.be\\.null\\b`, "g"),
    replacement: "expect($1).toBeNull()",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.be\\.undefined\\b`, "g"),
    replacement: "expect($1).toBeUndefined()",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.be\\.NaN\\b`, "g"),
    replacement: "expect($1).toBeNaN()",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.exist\\b`, "g"),
    replacement: "expect($1).toBeDefined()",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.not\\.exist\\b`, "g"),
    // Chai's `.not.exist` matches both null and undefined. `toBeUndefined`
    // matches only `undefined`. The PRD picks `toBeUndefined` as the closest
    // analogue; cases that legitimately need null-tolerance are flagged via
    // the residual-diff process.
    replacement: "expect($1).toBeUndefined()",
  },

  // -- Type assertions: be.a / be.an / instanceof Array -----------------
  {
    pattern: new RegExp(
      `${EXPECT_ARG}\\.to\\.be\\.an?\\(\\s*['"]array['"]\\s*\\)`,
      "g"
    ),
    replacement: "expect(Array.isArray($1)).toBe(true)",
  },
  {
    pattern: new RegExp(
      `${EXPECT_ARG}\\.to\\.be\\.instanceof\\(\\s*Array\\s*\\)`,
      "g"
    ),
    replacement: "expect(Array.isArray($1)).toBe(true)",
  },
  {
    pattern: new RegExp(
      `${EXPECT_ARG}\\.to\\.be\\.an?\\(\\s*['"](\\w+)['"]\\s*\\)`,
      "g"
    ),
    replacement: "expect(typeof $1).toBe('$2')",
  },

  // -- Length / property / membership / match / throw -------------------
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.have\\.lengthOf\\(`, "g"),
    replacement: "expect($1).toHaveLength(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.have\\.length\\(`, "g"),
    replacement: "expect($1).toHaveLength(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.have\\.property\\(`, "g"),
    replacement: "expect($1).toHaveProperty(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.(?:include|contain)\\(`, "g"),
    replacement: "expect($1).toContain(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.match\\(`, "g"),
    replacement: "expect($1).toMatch(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.throw\\(`, "g"),
    replacement: "expect($1).toThrow(",
  },
  {
    pattern: new RegExp(`${EXPECT_ARG}\\.to\\.throw\\b(?!\\()`, "g"),
    replacement: "expect($1).toThrow()",
  },

  // -- Sinon ------------------------------------------------------------
  // Argument-less spy/stub creators map to `vi.fn()`.
  { pattern: /\bsinon\.spy\(\s*\)/g, replacement: "vi.fn()" },
  { pattern: /\bsinon\.stub\(\s*\)/g, replacement: "vi.fn()" },
  // sinon.fake.returns(v) -> vi.fn().mockReturnValue(v)
  {
    pattern: /\bsinon\.fake\.returns\(/g,
    replacement: "vi.fn().mockReturnValue(",
  },
  {
    pattern: /\bsinon\.fake\.resolves\(/g,
    replacement: "vi.fn().mockResolvedValue(",
  },
  {
    pattern: /\bsinon\.fake\.rejects\(/g,
    replacement: "vi.fn().mockRejectedValue(",
  },
  { pattern: /\bsinon\.fake\(\s*\)/g, replacement: "vi.fn()" },
];

/**
 * Split a balanced two-arg expression `a, b` into `[a, b]`. Used for
 * `assert.equal(a, b)` style rewrites where `a` may contain nested parens.
 * Returns null if the expression doesn't have a top-level comma.
 */
function splitTwoArgs(expr: string): readonly [string, string] | null {
  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inString = ch as '"' | "'" | "`";
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) {
      return [expr.slice(0, i).trim(), expr.slice(i + 1).trim()];
    }
  }
  return null;
}

/**
 * Pass 1 — pure string transformation. Exported separately so unit tests
 * can exercise it without spinning up a ts-morph Project (which is slow).
 */
export function applyPass1(source: string): string {
  let out = source;

  // -- Balanced-paren `assert.*` rewrites (must precede regex rules) ---
  // These handle expressions with nested parens that the simple `[^)]+`
  // regex form can't capture.

  // Single-arg unary asserts.
  const unaryMap: ReadonlyArray<[RegExp, (e: string) => string]> = [
    [/\bassert\.isTrue\(/, (e) => `expect(${e}).toBe(true)`],
    [/\bassert\.isFalse\(/, (e) => `expect(${e}).toBe(false)`],
    [/\bassert\.isNull\(/, (e) => `expect(${e}).toBeNull()`],
    [/\bassert\.isNotNull\(/, (e) => `expect(${e}).not.toBeNull()`],
    [/\bassert\.isUndefined\(/, (e) => `expect(${e}).toBeUndefined()`],
    [/\bassert\.isDefined\(/, (e) => `expect(${e}).toBeDefined()`],
  ];
  for (const [prefix, template] of unaryMap) {
    out = rewriteBalanced(out, prefix, template);
  }

  // Binary asserts (`assert.equal(a, b)` -> `expect(a).toBe(b)`).
  const binaryMap: ReadonlyArray<[RegExp, (a: string, b: string) => string]> = [
    [/\bassert\.equal\(/, (a, b) => `expect(${a}).toBe(${b})`],
    [/\bassert\.strictEqual\(/, (a, b) => `expect(${a}).toBe(${b})`],
    [/\bassert\.deepEqual\(/, (a, b) => `expect(${a}).toEqual(${b})`],
    [/\bassert\.notEqual\(/, (a, b) => `expect(${a}).not.toBe(${b})`],
    [/\bassert\.lengthOf\(/, (a, b) => `expect(${a}).toHaveLength(${b})`],
    [/\bassert\.include\(/, (a, b) => `expect(${a}).toContain(${b})`],
    [/\bassert\.includes\(/, (a, b) => `expect(${a}).toContain(${b})`],
    [/\bassert\.match\(/, (a, b) => `expect(${a}).toMatch(${b})`],
  ];
  for (const [prefix, template] of binaryMap) {
    out = rewriteBalanced(out, prefix, (expr) => {
      const split = splitTwoArgs(expr);
      if (!split) return template(expr, "");
      return template(split[0], split[1]);
    });
  }

  // `assert.throws(fn)` and `assert.throws(fn, msg)`.
  out = rewriteBalanced(out, /\bassert\.throws\(/, (expr) => {
    const split = splitTwoArgs(expr);
    if (!split) return `expect(${expr.trim()}).toThrow()`;
    return `expect(${split[0]}).toThrow(${split[1]})`;
  });

  for (const rule of PASS_1_RULES) {
    out =
      typeof rule.replacement === "string"
        ? out.replace(rule.pattern, rule.replacement)
        : out.replace(rule.pattern, rule.replacement);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pass 2 — ts-morph AST pass.
// ---------------------------------------------------------------------------

interface Pass2Result {
  readonly source: string;
  readonly warnings: readonly string[];
}

/** Detect `sinon.stub(obj, 'method')...` chained calls and rewrite. */
function rewriteSinonStubChains(
  source: string
): { source: string; warnings: string[] } {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      target: 99, // ESNext
      module: 99,
    },
  });

  const sourceFile = project.createSourceFile("__codemod__.ts", source, {
    overwrite: true,
  });

  const warnings: string[] = [];

  // Walk every `sinon.stub(...)` call and rewrite the head of the chain to
  // `vi.spyOn(...)`. ts-morph mutates in place; re-emit at the end.
  //
  // We classify each call up-front:
  //   * `chained`       — followed by `.returns/.callsFake/.resolves/.rejects`
  //   * `bare`          — no chain → append `.mockImplementation(() => undefined)`
  // and process accordingly. Doing this in two passes (instead of iterating
  // `getDescendantsOfKind` twice on a mutating tree) keeps the bookkeeping
  // simple.
  const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of callExprs) {
    const expr = call.getExpression();
    if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) continue;

    const text = expr.getText();
    if (text !== "sinon.stub") continue;

    const args = call.getArguments();
    // We only transform the (obj, 'method') signature. The argument-less
    // `sinon.stub()` form is already handled by Pass 1.
    if (args.length < 2) continue;

    // Look ahead one chain link to decide bare vs. chained.
    const directParent = call.getParent();
    const isChained =
      directParent !== undefined &&
      directParent.getKind() === SyntaxKind.PropertyAccessExpression;

    if (!isChained) {
      // Bare: rewrite the entire call atomically so we don't mutate it twice.
      const argsText = args.map((a) => a.getText()).join(", ");
      call.replaceWithText(
        `vi.spyOn(${argsText}).mockImplementation(() => undefined)`
      );
      continue;
    }

    // Chained: replace `sinon.stub` with `vi.spyOn`, then walk up the chain
    // rewriting each `.returns/.callsFake/...` link.
    expr.replaceWithText("vi.spyOn");

    let cursor: CallExpression = call;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const parent = cursor.getParent();
      if (!parent) break;
      if (parent.getKind() !== SyntaxKind.PropertyAccessExpression) break;
      const grand = parent.getParent();
      if (!grand || grand.getKind() !== SyntaxKind.CallExpression) break;

      const propAccess = parent.asKind(SyntaxKind.PropertyAccessExpression);
      if (!propAccess) break;
      const methodName = propAccess.getName();

      const replacement =
        methodName === "returns"
          ? "mockReturnValue"
          : methodName === "callsFake"
            ? "mockImplementation"
            : methodName === "resolves"
              ? "mockResolvedValue"
              : methodName === "rejects"
                ? "mockRejectedValue"
                : null;

      if (replacement === null) {
        warnings.push(
          `unhandled sinon chain method '.${methodName}' (manual fixup required)`
        );
        break;
      }

      propAccess.getNameNode().replaceWithText(replacement);
      cursor = grand.asKindOrThrow(SyntaxKind.CallExpression);
    }
  }

  // Top-level `require('foo')` → `import foo from 'foo'`. Only the simplest
  // forms; anything else stays as-is and the user can mop up.
  const topRequires = sourceFile
    .getStatements()
    .filter((s) => s.getKind() === SyntaxKind.VariableStatement);
  for (const stmt of topRequires) {
    const text = stmt.getText();
    // const foo = require('bar');
    const matchSimple = text.match(
      /^const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?$/
    );
    if (matchSimple && matchSimple[1] && matchSimple[2]) {
      stmt.replaceWithText(
        `import ${matchSimple[1]} from '${matchSimple[2]}';`
      );
      continue;
    }
    // const { foo, bar } = require('baz');
    const matchDestruct = text.match(
      /^const\s+\{\s*([^}]+)\s*\}\s*=\s*require\(['"]([^'"]+)['"]\);?$/
    );
    if (matchDestruct && matchDestruct[1] && matchDestruct[2]) {
      stmt.replaceWithText(
        `import { ${matchDestruct[1].trim()} } from '${matchDestruct[2]}';`
      );
    }
  }

  // Report any surviving chai.* / sinon.* references — the codemod failed to
  // translate them and the user must handle them manually.
  const allText = sourceFile.getFullText();
  const chaiLeftover = allText.match(/\bchai\.\w+/g);
  const sinonLeftover = allText.match(/\bsinon\.\w+/g);
  if (chaiLeftover) {
    warnings.push(
      `Pass 2: ${chaiLeftover.length} unhandled chai.* reference(s) — manual fixup required: ${chaiLeftover
        .slice(0, 3)
        .join(", ")}${chaiLeftover.length > 3 ? "…" : ""}`
    );
  }
  if (sinonLeftover) {
    warnings.push(
      `Pass 2: ${sinonLeftover.length} unhandled sinon.* reference(s) — manual fixup required: ${sinonLeftover
        .slice(0, 3)
        .join(", ")}${sinonLeftover.length > 3 ? "…" : ""}`
    );
  }

  return {
    source: sourceFile.getFullText(),
    warnings,
  };
}

export function applyPass2(source: string): Pass2Result {
  const { source: rewritten, warnings } = rewriteSinonStubChains(source);
  return { source: rewritten, warnings };
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface MigrateResult {
  readonly source: string;
  readonly warnings: readonly string[];
}

/**
 * Run both passes and return the rewritten source + Pass-2 warnings. This is
 * the function CLI consumers and migrators should call.
 */
export function migrateFile(content: string): string {
  const pass1 = applyPass1(content);
  const { source } = applyPass2(pass1);
  return source;
}

/** Same as `migrateFile`, but also returns Pass-2 warnings. */
export function migrateFileWithWarnings(content: string): MigrateResult {
  const pass1 = applyPass1(content);
  return applyPass2(pass1);
}

// ---------------------------------------------------------------------------
// CLI entry point.
// ---------------------------------------------------------------------------

interface CliArgs {
  readonly inGlob: string;
  readonly outDir: string;
}

function parseCliArgs(argv: readonly string[]): CliArgs {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--in" || flag === "--out") {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error(`Missing value for ${flag}`);
      }
      args.set(flag, value);
      i++;
    }
  }
  const inGlob = args.get("--in");
  const outDir = args.get("--out");
  if (!inGlob || !outDir) {
    throw new Error("Usage: migrate-mocha-to-vitest --in <glob> --out <dir>");
  }
  return { inGlob, outDir };
}

async function runCli(argv: readonly string[]): Promise<void> {
  const { inGlob, outDir } = parseCliArgs(argv);

  // Lazy-import glob to keep the unit-test path fast.
  const { glob } = await import("glob");
  const files = await glob(inGlob, { absolute: true });

  if (files.length === 0) {
    // eslint-disable-next-line no-console
    console.error(`migrate-mocha-to-vitest: no files matched ${inGlob}`);
    process.exit(1);
  }

  await fs.mkdir(outDir, { recursive: true });

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const { source, warnings } = migrateFileWithWarnings(content);
    const base = path.basename(file).replace(/\.(?:js|ts)$/, ".test.ts");
    const outPath = path.join(outDir, base);
    await fs.writeFile(outPath, source, "utf8");
    // eslint-disable-next-line no-console
    console.log(`migrated: ${file} -> ${outPath}`);
    for (const w of warnings) {
      // eslint-disable-next-line no-console
      console.warn(`  warn: ${w}`);
    }
  }
}

if (
  typeof process !== "undefined" &&
  typeof import.meta.url === "string" &&
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href
) {
  runCli(process.argv.slice(2)).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
