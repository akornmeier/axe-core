/**
 * migrate-chai-assert-to-vitest.ts
 *
 * Companion codemod to `migrate-mocha-to-vitest.ts`. Converts chai's
 * `assert.*(...)` and bare `assert(...)` calls into Vitest `expect(...).to*(...)`
 * form. Built on ts-morph so we can reason about call arguments without
 * regex-shrapnel — chai assertions accept optional message arguments and may
 * contain nested commas/template literals that defeat naive string rewrites.
 *
 * Scope:
 *   • Phase 3 Sprint 4b — completes the Mocha→Vitest pipeline by translating
 *     the ~97 `.test.ts.todo` files that the prior codemod skipped because
 *     they used chai's TDD-style `assert.*` API rather than the BDD-style
 *     `expect(...).to.*` API.
 *   • Mapping table is documented in the Sprint 4b PRD; the implementation
 *     below mirrors that table 1:1. Unhandled methods are reported as
 *     warnings and the source is left untouched at those call sites.
 *
 * Optional message arguments (e.g. `assert.equal(a, b, 'msg')`) are dropped.
 * Vitest's matchers don't take an arbitrary message arg, and preserving the
 * message in a comment would make the diff considerably noisier. If the user
 * wants the messages back as comments that's a follow-up; flagged in the
 * report.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  Project,
  SyntaxKind,
  type CallExpression,
  type Node,
} from "ts-morph";

// ---------------------------------------------------------------------------
// Mapping table.
// ---------------------------------------------------------------------------

/**
 * Render a Vitest expectation from the chai `assert.*` arguments.
 *
 *   args  — original argument source texts (with optional message stripped)
 *   raw   — original argument source texts INCLUDING the trailing message arg
 *           (rarely needed — only for the bare `assert(value, msg)` case)
 */
type Renderer = (args: readonly string[]) => string;

interface AssertMapping {
  readonly arity: number; // minimum number of non-message args required
  readonly maxArity?: number; // optional upper bound; defaults to `arity`
  readonly render: Renderer;
}

const ASSERT_MAP: Readonly<Record<string, AssertMapping>> = {
  // Boolean / truthy ------------------------------------------------------
  isTrue: { arity: 1, render: ([a]) => `expect(${a}).toBe(true)` },
  isNotTrue: { arity: 1, render: ([a]) => `expect(${a}).not.toBe(true)` },
  isFalse: { arity: 1, render: ([a]) => `expect(${a}).toBe(false)` },
  isNotFalse: { arity: 1, render: ([a]) => `expect(${a}).not.toBe(false)` },
  isOk: { arity: 1, render: ([a]) => `expect(${a}).toBeTruthy()` },
  ok: { arity: 1, render: ([a]) => `expect(${a}).toBeTruthy()` },
  isNotOk: { arity: 1, render: ([a]) => `expect(${a}).toBeFalsy()` },
  notOk: { arity: 1, render: ([a]) => `expect(${a}).toBeFalsy()` },

  // Null / undefined / existence -----------------------------------------
  isNull: { arity: 1, render: ([a]) => `expect(${a}).toBeNull()` },
  isNotNull: { arity: 1, render: ([a]) => `expect(${a}).not.toBeNull()` },
  isUndefined: { arity: 1, render: ([a]) => `expect(${a}).toBeUndefined()` },
  isDefined: { arity: 1, render: ([a]) => `expect(${a}).toBeDefined()` },
  isNotUndefined: {
    arity: 1,
    render: ([a]) => `expect(${a}).not.toBeUndefined()`,
  },
  // Chai `assert.exists(x)` ⇔ x !== null && x !== undefined.
  exists: { arity: 1, render: ([a]) => `expect(${a} != null).toBe(true)` },
  notExists: { arity: 1, render: ([a]) => `expect(${a} == null).toBe(true)` },

  // Equality --------------------------------------------------------------
  // Chai's `assert.equal` is `==` (loose); `.toBe` is `===`. The Sprint 4b
  // PRD calls this out — we map both equal/strictEqual → toBe and rely on
  // the test suite to catch any test that depended on coercion. None of the
  // 97 candidate files appear to rely on coercion; flagged in the report.
  equal: { arity: 2, render: ([a, b]) => `expect(${a}).toBe(${b})` },
  notEqual: { arity: 2, render: ([a, b]) => `expect(${a}).not.toBe(${b})` },
  strictEqual: { arity: 2, render: ([a, b]) => `expect(${a}).toBe(${b})` },
  notStrictEqual: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).not.toBe(${b})`,
  },
  deepEqual: { arity: 2, render: ([a, b]) => `expect(${a}).toEqual(${b})` },
  notDeepEqual: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).not.toEqual(${b})`,
  },
  deepStrictEqual: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).toEqual(${b})`,
  },

  // Type predicates -------------------------------------------------------
  isArray: {
    arity: 1,
    render: ([a]) => `expect(Array.isArray(${a})).toBe(true)`,
  },
  isNotArray: {
    arity: 1,
    render: ([a]) => `expect(Array.isArray(${a})).toBe(false)`,
  },
  isFunction: {
    arity: 1,
    render: ([a]) => `expect(typeof ${a}).toBe('function')`,
  },
  isNotFunction: {
    arity: 1,
    render: ([a]) => `expect(typeof ${a}).not.toBe('function')`,
  },
  isString: { arity: 1, render: ([a]) => `expect(typeof ${a}).toBe('string')` },
  isNotString: {
    arity: 1,
    render: ([a]) => `expect(typeof ${a}).not.toBe('string')`,
  },
  isNumber: { arity: 1, render: ([a]) => `expect(typeof ${a}).toBe('number')` },
  isNotNumber: {
    arity: 1,
    render: ([a]) => `expect(typeof ${a}).not.toBe('number')`,
  },
  isBoolean: {
    arity: 1,
    render: ([a]) => `expect(typeof ${a}).toBe('boolean')`,
  },
  isNotBoolean: {
    arity: 1,
    render: ([a]) => `expect(typeof ${a}).not.toBe('boolean')`,
  },
  // Chai `assert.isObject(x)` ⇔ typeof x === 'object' && x !== null. Chai
  // accepts arrays as objects too; the single-expression form here matches
  // that.
  isObject: {
    arity: 1,
    render: ([a]) =>
      `expect(typeof ${a} === 'object' && ${a} !== null).toBe(true)`,
  },
  isNotObject: {
    arity: 1,
    render: ([a]) => `expect(typeof ${a}).not.toBe('object')`,
  },
  // assert.typeOf(x, 'string') → expect(typeof x).toBe('string')
  typeOf: { arity: 2, render: ([a, b]) => `expect(typeof ${a}).toBe(${b})` },
  notTypeOf: {
    arity: 2,
    render: ([a, b]) => `expect(typeof ${a}).not.toBe(${b})`,
  },

  // Length / membership ---------------------------------------------------
  lengthOf: { arity: 2, render: ([a, b]) => `expect(${a}).toHaveLength(${b})` },
  // `assert.isEmpty(x)` is true iff x has length/size 0 OR is an object with
  // zero own-enumerable keys. The 97-file scan shows it's only ever called on
  // arrays/strings/objects-as-records — so emit `Object.keys(x).length`.
  // It's the safest match that handles all three shapes.
  isEmpty: {
    arity: 1,
    render: ([a]) =>
      `expect(${a} == null ? 0 : (typeof ${a} === 'string' || Array.isArray(${a}) ? ${a}.length : Object.keys(${a}).length)).toBe(0)`,
  },
  isNotEmpty: {
    arity: 1,
    render: ([a]) =>
      `expect(${a} == null ? 0 : (typeof ${a} === 'string' || Array.isArray(${a}) ? ${a}.length : Object.keys(${a}).length)).not.toBe(0)`,
  },
  include: { arity: 2, render: ([a, b]) => `expect(${a}).toContain(${b})` },
  notInclude: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).not.toContain(${b})`,
  },
  includeMembers: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).toEqual(expect.arrayContaining(${b}))`,
  },
  sameMembers: {
    arity: 2,
    render: ([a, b]) =>
      `expect([...${a}].sort()).toEqual([...${b}].sort())`,
  },

  // Match / regex / throws ------------------------------------------------
  match: { arity: 2, render: ([a, b]) => `expect(${a}).toMatch(${b})` },
  notMatch: { arity: 2, render: ([a, b]) => `expect(${a}).not.toMatch(${b})` },
  throws: {
    arity: 1,
    maxArity: 2,
    render: (args) =>
      args.length === 1
        ? `expect(${args[0]}).toThrow()`
        : `expect(${args[0]}).toThrow(${args[1]})`,
  },
  doesNotThrow: { arity: 1, render: ([a]) => `expect(${a}).not.toThrow()` },

  // Instance / property --------------------------------------------------
  instanceOf: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).toBeInstanceOf(${b})`,
  },
  notInstanceOf: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).not.toBeInstanceOf(${b})`,
  },
  property: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).toHaveProperty(${b})`,
  },
  notProperty: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).not.toHaveProperty(${b})`,
  },
  propertyVal: {
    arity: 3,
    render: ([a, b, c]) => `expect(${a}).toHaveProperty(${b}, ${c})`,
  },
  notPropertyVal: {
    arity: 3,
    render: ([a, b, c]) => `expect(${a}).not.toHaveProperty(${b}, ${c})`,
  },
  // For hasAllKeys/containsAllKeys/hasAnyKeys we approximate via Object.keys.
  // hasAllKeys: object has EXACTLY these keys (chai); we rewrite as exact match.
  hasAllKeys: {
    arity: 2,
    render: ([a, b]) =>
      `expect(Object.keys(${a}).sort()).toEqual([...${b}].sort())`,
  },
  // containsAllKeys: object contains AT LEAST these keys.
  containsAllKeys: {
    arity: 2,
    render: ([a, b]) =>
      `expect(Object.keys(${a})).toEqual(expect.arrayContaining(${b}))`,
  },
  // hasAnyKeys: object has at least one of these keys.
  hasAnyKeys: {
    arity: 2,
    render: ([a, b]) =>
      `expect([...${b}].some(__k => Object.prototype.hasOwnProperty.call(${a}, __k))).toBe(true)`,
  },

  // Numeric ordering ------------------------------------------------------
  isAbove: { arity: 2, render: ([a, b]) => `expect(${a}).toBeGreaterThan(${b})` },
  isAtLeast: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).toBeGreaterThanOrEqual(${b})`,
  },
  isBelow: { arity: 2, render: ([a, b]) => `expect(${a}).toBeLessThan(${b})` },
  isAtMost: {
    arity: 2,
    render: ([a, b]) => `expect(${a}).toBeLessThanOrEqual(${b})`,
  },
  // closeTo / approximately use ABSOLUTE delta (chai). Vitest's `toBeCloseTo`
  // uses decimal-place precision. Rewrite as an absolute-difference check so
  // semantics are preserved exactly.
  closeTo: {
    arity: 3,
    render: ([a, b, c]) =>
      `expect(Math.abs(${a} - ${b})).toBeLessThanOrEqual(${c})`,
  },
  approximately: {
    arity: 3,
    render: ([a, b, c]) =>
      `expect(Math.abs(${a} - ${b})).toBeLessThanOrEqual(${c})`,
  },

  // Misc ------------------------------------------------------------------
  // assert.fail([msg]) — Vitest doesn't have expect.fail() directly. We
  // wrap a throw in an IIFE so the replacement remains a CallExpression
  // (ts-morph requires the new node kind to be compatible with the slot
  // we're replacing). The IIFE form preserves runtime semantics — the
  // surrounding ExpressionStatement still evaluates and throws.
  fail: {
    arity: 0,
    maxArity: 4,
    render: (args) =>
      args.length === 0
        ? `(() => { throw new Error('assert.fail'); })()`
        : `(() => { throw new Error(${args[args.length - 1]}); })()`,
  },
  // assert.isNaN
  isNaN: { arity: 1, render: ([a]) => `expect(${a}).toBeNaN()` },
  isNotNaN: { arity: 1, render: ([a]) => `expect(${a}).not.toBeNaN()` },
  // assert.isFinite
  isFinite: {
    arity: 1,
    render: ([a]) => `expect(Number.isFinite(${a})).toBe(true)`,
  },
};

// ---------------------------------------------------------------------------
// Optional message-argument heuristics. Chai accepts a final string argument
// as a human-readable message on most assertions. We strip it because Vitest
// matchers don't accept one. The heuristic: if the call has one MORE argument
// than the mapping's arity AND the trailing arg is a string-literal-shaped
// expression (string literal, template literal, or string-concat), drop it.
// If the trailing arg is a non-string expression we leave the call alone and
// emit a warning — that means the call doesn't match the documented chai
// shape (e.g. someone passed an extra real argument) and the migrator should
// handle it manually.
// ---------------------------------------------------------------------------

function isLikelyMessageArg(node: Node): boolean {
  const k = node.getKind();
  return (
    k === SyntaxKind.StringLiteral ||
    k === SyntaxKind.NoSubstitutionTemplateLiteral ||
    k === SyntaxKind.TemplateExpression
  );
}

/**
 * Methods whose chai signature is `assert.X(value, [message])` — i.e. the
 * trailing arg is ALWAYS a message, even if it's an identifier or expression
 * (chai stringifies it). For these we strip the trailing arg unconditionally
 * when the call has exactly `arity + 1` args.
 */
const TRAILING_MESSAGE_METHODS = new Set([
  "ok",
  "notOk",
  "isOk",
  "isNotOk",
  "isTrue",
  "isFalse",
  "isNotTrue",
  "isNotFalse",
  "isNull",
  "isNotNull",
  "isUndefined",
  "isDefined",
  "isNotUndefined",
  "exists",
  "notExists",
  "isFunction",
  "isNotFunction",
  "isString",
  "isNotString",
  "isNumber",
  "isNotNumber",
  "isBoolean",
  "isNotBoolean",
  "isObject",
  "isNotObject",
  "isArray",
  "isNotArray",
  "isEmpty",
  "isNotEmpty",
  "isNaN",
  "isNotNaN",
  "isFinite",
  "doesNotThrow",
]);

// ---------------------------------------------------------------------------
// Vitest + axe-helper import injection. The browser project doesn't enable
// globals, so any file that uses `describe/it/expect` needs an explicit
// named import. The legacy Mocha/Karma suites also relied on `axe` being
// global (via the script tag); Vitest tests must import it from the helper
// module. Both imports are idempotent — already-present imports are left
// alone.
// ---------------------------------------------------------------------------

const VITEST_IMPORT_RE = /from\s+['"]vitest['"]/;

const VITEST_IMPORT_LINE =
  "import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';\n";

const HELPERS_IMPORT_RE = /from\s+['"]@helpers\/check-helpers['"]/;

const HELPERS_IMPORT_LINE = "import { axe } from '@helpers/check-helpers';\n";

/**
 * Add a `from 'vitest'` import at the top of the file when none is present.
 * Returns the source unchanged if the file already imports from vitest, OR
 * if the file uses none of the symbols we'd inject.
 */
export function ensureVitestImport(source: string): string {
  if (VITEST_IMPORT_RE.test(source)) return source;
  // Heuristic: only add the import when at least one Vitest API is referenced
  // outside strings/comments. Avoids polluting non-test files.
  if (!/\b(?:describe|it|expect|beforeAll|beforeEach|afterAll|afterEach|vi)\b/.test(source)) {
    return source;
  }
  return VITEST_IMPORT_LINE + source;
}

/**
 * Add `import { axe } from '@helpers/check-helpers';` when the file uses
 * the bare identifier `axe` and doesn't already import from the helpers
 * module. This unblocks tests that previously relied on `axe` being a
 * Karma global.
 */
export function ensureHelpersImport(source: string): string {
  if (HELPERS_IMPORT_RE.test(source)) return source;
  // `\baxe\.` — followed by a dot, so we don't false-positive on `axe-core`
  // strings or unrelated identifiers like `axes`.
  if (!/\baxe\./.test(source)) return source;
  return HELPERS_IMPORT_LINE + source;
}

// ---------------------------------------------------------------------------
// Header strip — remove the Sprint 4b FIXME marker the prior codemod stamped.
// ---------------------------------------------------------------------------

const FIXME_HEADER = /^\/\/\s*FIXME\(phase-3-sprint-4b\):[^\n]*\n/;

/**
 * Strip the chai-assert clause from a multi-clause FIXME header. If the
 * header had ONLY the chai clause, drop the whole line. Otherwise rewrite
 * the line with the clause removed so the remaining blockers are still
 * surfaced.
 */
export function stripChaiAssertFixme(source: string): string {
  const m = source.match(FIXME_HEADER);
  if (!m) return source;
  const line = m[0];

  // Patterns to remove from the FIXME line.
  const clausePatterns = [
    /\s*;?\s*uses chai-style 'assert\.\*' \(codemod did not convert\)/g,
    /\s*;?\s*uses chai-style 'assert\(\.\.\.\)' \(codemod did not convert\)/g,
  ];

  let stripped = line;
  for (const p of clausePatterns) {
    stripped = stripped.replace(p, "");
  }

  // If the header collapses to just `// FIXME(phase-3-sprint-4b): codemod blocker — `
  // (no remaining clauses), drop the line entirely.
  if (
    /^\/\/\s*FIXME\(phase-3-sprint-4b\):\s*codemod blocker\s*[—-]?\s*\n?$/.test(
      stripped
    )
  ) {
    return source.slice(line.length);
  }

  // Trim leading "; " left over after removing the first clause.
  stripped = stripped.replace(/—\s*;\s*/, "— ");
  // Ensure trailing newline is preserved.
  if (!stripped.endsWith("\n")) stripped += "\n";
  return stripped + source.slice(line.length);
}

// ---------------------------------------------------------------------------
// AST rewrite.
// ---------------------------------------------------------------------------

export interface MigrateChaiAssertResult {
  readonly source: string;
  readonly warnings: readonly string[];
  readonly unhandled: readonly string[]; // distinct assert.* names that weren't rewritten
  readonly rewriteCount: number;
}

/** Rewrite a single `assert(...)` or `assert.X(...)` call. */
function rewriteAssertCall(
  call: CallExpression,
  warnings: string[],
  unhandled: Set<string>
): boolean {
  const expr = call.getExpression();
  const exprKind = expr.getKind();

  // Bare `assert(value[, msg])` ----------------------------------------
  if (exprKind === SyntaxKind.Identifier && expr.getText() === "assert") {
    const args = call.getArguments();
    if (args.length === 0) {
      warnings.push("bare assert() with no arguments — left untouched");
      return false;
    }
    const valueArg = args[0]?.getText() ?? "undefined";
    // If a 2nd arg is present and looks like a message, drop it. If it's a
    // real value, the call shape doesn't match chai's `assert(value[, msg])`
    // — leave it alone and warn.
    if (args.length === 1) {
      call.replaceWithText(`expect(${valueArg}).toBeTruthy()`);
      return true;
    }
    const second = args[1];
    if (args.length === 2 && second && isLikelyMessageArg(second)) {
      call.replaceWithText(`expect(${valueArg}).toBeTruthy()`);
      return true;
    }
    warnings.push(
      `bare assert() with non-message 2nd arg at line ${call.getStartLineNumber()} — manual review required`
    );
    return false;
  }

  if (exprKind !== SyntaxKind.PropertyAccessExpression) return false;
  const propAccess = expr.asKind(SyntaxKind.PropertyAccessExpression);
  if (!propAccess) return false;
  const objText = propAccess.getExpression().getText();
  if (objText !== "assert") return false;

  const methodName = propAccess.getName();
  const mapping = ASSERT_MAP[methodName];
  if (!mapping) {
    unhandled.add(methodName);
    return false;
  }

  const allArgs = call.getArguments();
  const minArity = mapping.arity;
  const maxArity = mapping.maxArity ?? mapping.arity;

  // Decide how many trailing args to drop as a "message".
  let nonMessageArgs = allArgs.slice();
  const trailingMsgUnconditional =
    TRAILING_MESSAGE_METHODS.has(methodName);

  if (allArgs.length > maxArity) {
    // Trailing arg(s) beyond maxArity — drop if they look like messages, or
    // unconditionally for methods whose chai signature documents the
    // trailing arg as a (possibly non-string) message.
    let i = allArgs.length;
    while (i > maxArity && i > 0) {
      const trailing = allArgs[i - 1];
      if (
        !trailing ||
        !(trailingMsgUnconditional || isLikelyMessageArg(trailing))
      ) {
        break;
      }
      i--;
    }
    if (i > maxArity) {
      // Couldn't strip down to maxArity — leave it.
      warnings.push(
        `assert.${methodName}() at line ${call.getStartLineNumber()}: ${allArgs.length} args (max ${maxArity}) and trailing arg is non-message — manual review required`
      );
      return false;
    }
    nonMessageArgs = allArgs.slice(0, i);
  } else if (allArgs.length === minArity + 1) {
    const trailing = allArgs[allArgs.length - 1];
    if (
      trailing &&
      (trailingMsgUnconditional || isLikelyMessageArg(trailing))
    ) {
      // Exactly one extra arg and it's a message → strip.
      nonMessageArgs = allArgs.slice(0, minArity);
    }
  }

  if (nonMessageArgs.length < minArity) {
    warnings.push(
      `assert.${methodName}() at line ${call.getStartLineNumber()}: too few args (got ${nonMessageArgs.length}, need ${minArity}) — manual review required`
    );
    return false;
  }
  if (nonMessageArgs.length > maxArity) {
    warnings.push(
      `assert.${methodName}() at line ${call.getStartLineNumber()}: too many args (got ${nonMessageArgs.length}, max ${maxArity}) — manual review required`
    );
    return false;
  }

  const argTexts = nonMessageArgs.map((a) => a.getText());
  const replacement = mapping.render(argTexts);
  call.replaceWithText(replacement);
  return true;
}

/** Walk the source file once and rewrite every recognized assert call. */
function rewriteAsserts(source: string): MigrateChaiAssertResult {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      target: 99,
      module: 99,
    },
  });

  const sourceFile = project.createSourceFile("__chai-assert__.ts", source, {
    overwrite: true,
  });

  const warnings: string[] = [];
  const unhandled = new Set<string>();
  let rewriteCount = 0;

  // Repeated-pass walk: rewriting a call mutates the tree. Re-collect each
  // pass until no more rewrites happen. Bounded at 50 passes — way more than
  // any real test file needs (the largest in the 97 files has ~120 asserts).
  for (let pass = 0; pass < 500; pass++) {
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    let madeChange = false;
    for (const call of calls) {
      // The previous rewrite may have removed this node from the tree.
      if (call.wasForgotten()) continue;
      try {
        if (rewriteAssertCall(call, warnings, unhandled)) {
          rewriteCount++;
          madeChange = true;
          // Restart this pass — the tree has shifted and our remaining
          // collected nodes may be stale.
          break;
        }
      } catch (err) {
        // ts-morph occasionally rejects a replacement when the new node
        // kind doesn't fit the slot. Surface it as a warning rather than
        // aborting the whole file — the user can patch the call by hand.
        const lineNo = call.wasForgotten()
          ? "?"
          : String(call.getStartLineNumber());
        const callText = call.wasForgotten()
          ? "<forgotten>"
          : call.getText().slice(0, 80);
        warnings.push(
          `ts-morph rejected replacement at line ${lineNo} (${callText}): ${(err as Error).message?.split("\n")[0]}`
        );
      }
    }
    if (!madeChange) break;
  }

  return {
    source: sourceFile.getFullText(),
    warnings,
    unhandled: [...unhandled].sort(),
    rewriteCount,
  };
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export function migrateChaiAssert(content: string): MigrateChaiAssertResult {
  // 1. Strip the FIXME header clause (chai-assert blocker is now resolved).
  const headerStripped = stripChaiAssertFixme(content);
  // 2. Rewrite all assert calls.
  const rewritten = rewriteAsserts(headerStripped);
  // 3. Add the vitest + axe-helper imports if the file needs them. The
  //    browser project doesn't enable globals, so describe/it/expect must
  //    be imported, and `axe` is no longer a Karma global.
  const withVitest = ensureVitestImport(rewritten.source);
  const withHelpers = ensureHelpersImport(withVitest);
  return { ...rewritten, source: withHelpers };
}

/** Convenience wrapper returning only the rewritten source. */
export function migrateChaiAssertSource(content: string): string {
  return migrateChaiAssert(content).source;
}

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
      // Read newline-separated paths lazily at runCli time.
      files.push(`@listfile:${f}`);
    } else {
      files.push(a);
    }
  }
  if (files.length === 0) {
    throw new Error(
      "Usage: migrate-chai-assert-to-vitest [--check] <file...> | --from-file <list>"
    );
  }
  return { files, check };
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const { files, check } = parseCliArgs(argv);

  // Expand list-files.
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
  let totalUnhandled = new Set<string>();
  let touched = 0;

  for (const file of expanded) {
    const abs = path.resolve(file);
    let content: string;
    try {
      content = await fs.readFile(abs, "utf8");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`migrate-chai-assert: cannot read ${abs}: ${(err as Error).message}`);
      continue;
    }
    let result: MigrateChaiAssertResult;
    try {
      result = migrateChaiAssert(content);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `migrate-chai-assert: failed to migrate ${abs}: ${(err as Error).message?.split("\n")[0]}`
      );
      continue;
    }
    totalRewrites += result.rewriteCount;
    for (const u of result.unhandled) totalUnhandled.add(u);

    if (result.source !== content) {
      touched++;
      if (!check) {
        await fs.writeFile(abs, result.source, "utf8");
      }
      // eslint-disable-next-line no-console
      console.log(
        `${check ? "would-rewrite" : "rewrote"}: ${abs} (${result.rewriteCount} call${result.rewriteCount === 1 ? "" : "s"})`
      );
    }

    for (const w of result.warnings) {
      // eslint-disable-next-line no-console
      console.warn(`  warn (${path.basename(abs)}): ${w}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `\nmigrate-chai-assert: ${touched}/${expanded.length} files touched, ${totalRewrites} call(s) rewritten.`
  );
  if (totalUnhandled.size > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `migrate-chai-assert: ${totalUnhandled.size} unhandled assert.* method(s): ${[...totalUnhandled].sort().join(", ")}`
    );
  }
  return totalUnhandled.size > 0 ? 0 : 0;
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
