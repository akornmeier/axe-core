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
// String / comment scanner. Pass 1 rewrites must NOT touch text inside string
// literals or comments — chai-like patterns embedded in user-facing strings
// or explanatory comments must be preserved verbatim. This scanner emits a
// flat list of { kind, text } spans so callers can rewrite only CODE spans
// and re-join.
// ---------------------------------------------------------------------------

export type CodeSpanKind = "code" | "string" | "comment";

export interface CodeSpan {
  readonly kind: CodeSpanKind;
  readonly text: string;
}

/**
 * Tokenize `source` into spans. Each span is one of:
 *   - 'code'    — JS/TS source outside any string or comment
 *   - 'string'  — the entirety of a single-quoted, double-quoted, or
 *                 backtick-template string (including its delimiters and any
 *                 nested `${...}` interpolations)
 *   - 'comment' — a line comment (`// ...`) or block comment (`/* ... *\/`)
 *
 * Notes / scope:
 *   - Escape-aware (`\"`, `\\`, `\``).
 *   - Template literals correctly recurse through `${...}` (which themselves
 *     can contain code spans, strings, and comments). The outer span is
 *     reported as a single 'string' span — a Pass 1 rewrite would never
 *     fire inside a template anyway, and chasing the contents would let
 *     rewrites bleed back into user-visible text. This is intentional.
 *   - Regex literals are NOT classified — they remain in 'code' spans.
 *     Pass 1's patterns do not match the inside of typical regex bodies in
 *     practice; if they ever do, the AST pass (Pass 2) is the safer remedy.
 *   - This is a pragmatic scanner for test-file rewrites, not a full JS
 *     lexer. It is exported so unit tests can pin its behaviour.
 */
export function splitCodeSpans(source: string): CodeSpan[] {
  const spans: CodeSpan[] = [];
  let i = 0;
  let codeStart = 0;
  const len = source.length;

  const flushCode = (end: number): void => {
    if (end > codeStart) {
      spans.push({ kind: "code", text: source.slice(codeStart, end) });
    }
  };

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    // Line comment.
    if (ch === "/" && next === "/") {
      flushCode(i);
      const start = i;
      i += 2;
      while (i < len && source[i] !== "\n") i++;
      spans.push({ kind: "comment", text: source.slice(start, i) });
      codeStart = i;
      continue;
    }

    // Block comment.
    if (ch === "/" && next === "*") {
      flushCode(i);
      const start = i;
      i += 2;
      while (i < len && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i = Math.min(i + 2, len);
      spans.push({ kind: "comment", text: source.slice(start, i) });
      codeStart = i;
      continue;
    }

    // Single- or double-quoted string.
    if (ch === '"' || ch === "'") {
      flushCode(i);
      const quote = ch;
      const start = i;
      i++;
      while (i < len) {
        const c = source[i];
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        // Plain quoted strings cannot span a raw newline; bail safely if
        // they do (treat as terminated to avoid infinite loops on malformed
        // input).
        if (c === "\n") {
          i++;
          break;
        }
        i++;
      }
      spans.push({ kind: "string", text: source.slice(start, i) });
      codeStart = i;
      continue;
    }

    // Template literal (backtick). Walk through `${...}` (which may contain
    // strings, comments, and nested templates) and record the outer span as
    // a single 'string'.
    if (ch === "`") {
      flushCode(i);
      const start = i;
      i++;
      let depth = 0;
      while (i < len) {
        const c = source[i];
        if (depth === 0) {
          if (c === "\\") {
            i += 2;
            continue;
          }
          if (c === "`") {
            i++;
            break;
          }
          if (c === "$" && source[i + 1] === "{") {
            depth = 1;
            i += 2;
            continue;
          }
          i++;
          continue;
        }
        // Inside ${...}: track braces, strings, templates, and comments so
        // that the outer template's terminating backtick isn't mis-detected.
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === '"' || c === "'") {
          const innerQuote = c;
          i++;
          while (i < len) {
            const ic = source[i];
            if (ic === "\\") {
              i += 2;
              continue;
            }
            if (ic === innerQuote || ic === "\n") {
              i++;
              break;
            }
            i++;
          }
          continue;
        }
        if (c === "`") {
          // Nested template literal — recurse via splitCodeSpans on the
          // remainder is overkill; instead consume it as a raw template
          // span by walking the same algorithm inline.
          let nestedDepth = 0;
          i++;
          while (i < len) {
            const nc = source[i];
            if (nestedDepth === 0) {
              if (nc === "\\") {
                i += 2;
                continue;
              }
              if (nc === "`") {
                i++;
                break;
              }
              if (nc === "$" && source[i + 1] === "{") {
                nestedDepth = 1;
                i += 2;
                continue;
              }
              i++;
              continue;
            }
            if (nc === "{") nestedDepth++;
            else if (nc === "}") nestedDepth--;
            i++;
          }
          continue;
        }
        if (c === "/" && source[i + 1] === "/") {
          while (i < len && source[i] !== "\n") i++;
          continue;
        }
        if (c === "/" && source[i + 1] === "*") {
          i += 2;
          while (i < len && !(source[i] === "*" && source[i + 1] === "/")) i++;
          i = Math.min(i + 2, len);
          continue;
        }
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            i++;
            continue;
          }
        }
        i++;
      }
      spans.push({ kind: "string", text: source.slice(start, i) });
      codeStart = i;
      continue;
    }

    i++;
  }

  flushCode(len);
  return spans;
}

/**
 * Build a `(index) => boolean` predicate that returns true when `index` is
 * inside a STRING or COMMENT span — i.e. NOT in user code. Lets rules whose
 * match patterns include literal text (e.g. `.to.be.a('string')`) operate
 * on the whole source while still skipping matches that originate inside
 * unrelated strings or comments.
 */
function buildInTextPredicate(source: string): (idx: number) => boolean {
  const spans = splitCodeSpans(source);
  // Pre-compute end offsets so we can binary-search; spans are short and
  // few (<2k typical) so a linear scan is fine.
  type Range = { start: number; end: number; isText: boolean };
  const ranges: Range[] = [];
  let off = 0;
  for (const s of spans) {
    ranges.push({
      start: off,
      end: off + s.text.length,
      isText: s.kind !== "code",
    });
    off += s.text.length;
  }
  return (idx: number) => {
    for (const r of ranges) {
      if (idx >= r.start && idx < r.end) return r.isText;
    }
    return false;
  };
}

/**
 * Run a regex rule on `source`, but skip matches whose START position is
 * inside a string literal or comment.
 */
function replaceOutsideStringsAndComments(
  source: string,
  pattern: RegExp,
  replacement: string | ((...args: string[]) => string)
): string {
  const inText = buildInTextPredicate(source);
  return source.replace(pattern, (...args: unknown[]) => {
    // String.replace passes match, ...captures, offset, fullString to the
    // function form. The offset is the second-to-last argument when the
    // last is the string; with named groups it's third-from-last. We rely
    // on the standard signature here (no named groups in our patterns).
    const match = args[0] as string;
    // The offset is `args[args.length - 2]` for replace without named
    // groups, or args[args.length - 3] when a `groups` object is present.
    const last = args[args.length - 1];
    const offset =
      typeof last === "object"
        ? (args[args.length - 3] as number)
        : (args[args.length - 2] as number);
    if (inText(offset)) return match;
    if (typeof replacement === "string") {
      // Re-implement $N substitution since we can't delegate back to
      // String.replace on a literal string.
      return replacement.replace(/\$(\d+|&)/g, (_m, key: string) => {
        if (key === "&") return match;
        const n = Number(key);
        const cap = args[n] as string | undefined;
        return cap ?? "";
      });
    }
    return replacement(...(args as string[]));
  });
}

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

/**
 * Line-anchored declaration rules that intentionally include string literals
 * in their match (`'use strict'`, `from 'chai'`, etc.). These run BEFORE
 * the scanner-aware bank because they target the literal itself; gating
 * them on the scanner would cause the predicate to (correctly) report the
 * match start as inside a string and skip the rewrite. They are anchored
 * to a line start under `gm` mode and target only top-level declarations,
 * so the false-positive risk in test files is negligible.
 */
const TOP_LEVEL_DECL_RULES: readonly RegexRule[] = [
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
];

const PASS_1_RULES: readonly RegexRule[] = [
  // Mocha lifecycle aliases. Require a leading start-of-line or whitespace so
  // we don't rewrite method calls on an object (`obj.before(...)` →
  // `obj.beforeAll(...)`).
  { pattern: /(^|\s)before\s*\(/g, replacement: "$1beforeAll(" },
  { pattern: /(^|\s)after\s*\(/g, replacement: "$1afterAll(" },
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
  // NOTE: `.to.not.exist` is intentionally NOT rewritten here. Chai's
  // `.not.exist` accepts both null and undefined; Vitest's `toBeUndefined`
  // does not. Silently rewriting either way is semantic drift, so Pass 2
  // detects this pattern and emits a warning so the human reviews the
  // call site. See `detectNotExistDrift` below.

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
 * Variant of `rewriteBalanced` that skips matches whose match start is
 * inside a string literal or comment. Used by the `assert.*` balanced-paren
 * rewrites to honor the same string/comment safety as the regex bank.
 */
function rewriteBalancedSafe(
  source: string,
  prefix: RegExp,
  template: (expr: string) => string
): string {
  const inText = buildInTextPredicate(source);
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
    if (inText(matchStart)) {
      // Skip over this match and continue scanning past it.
      out += source.slice(i, matchStart + match[0].length);
      i = matchStart + match[0].length;
      continue;
    }
    const openParen = matchStart + match[0].length - 1;
    if (source[openParen] !== "(") {
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
 * Pass 1 — pure string transformation. Exported separately so unit tests
 * can exercise it without spinning up a ts-morph Project (which is slow).
 *
 * Every rewrite is gated on a string/comment scanner: matches whose start
 * position falls inside a string literal or comment are left alone. This
 * is critical when bulk-rewriting test files whose comments and message
 * strings frequently contain explanatory chai-like text.
 */
export function applyPass1(source: string): string {
  let out = source;

  // -- Top-level declaration strips run on the whole source (their match
  //    intentionally includes a string literal). --------------------------
  for (const rule of TOP_LEVEL_DECL_RULES) {
    out =
      typeof rule.replacement === "string"
        ? out.replace(rule.pattern, rule.replacement)
        : out.replace(rule.pattern, rule.replacement);
  }

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
    out = rewriteBalancedSafe(out, prefix, template);
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
    out = rewriteBalancedSafe(out, prefix, (expr) => {
      const split = splitTwoArgs(expr);
      if (!split) return template(expr, "");
      return template(split[0], split[1]);
    });
  }

  // `assert.throws(fn)` and `assert.throws(fn, msg)`.
  out = rewriteBalancedSafe(out, /\bassert\.throws\(/, (expr) => {
    const split = splitTwoArgs(expr);
    if (!split) return `expect(${expr.trim()}).toThrow()`;
    return `expect(${split[0]}).toThrow(${split[1]})`;
  });

  for (const rule of PASS_1_RULES) {
    out = replaceOutsideStringsAndComments(out, rule.pattern, rule.replacement);
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

  // `.to.not.exist` (Chai) accepts both null and undefined; Vitest's
  // `toBeUndefined` does not. Rather than silently rewrite (semantic drift),
  // surface every site as a warning so the migrator can review by hand.
  // Only count occurrences in CODE spans so explanatory comments don't
  // trigger false positives.
  const codeOnlyText = splitCodeSpans(allText)
    .filter((s) => s.kind === "code")
    .map((s) => s.text)
    .join("");
  const notExistMatches = codeOnlyText.match(
    /expect\([^)]*\)\.to\.not\.exist\b/g
  );
  if (notExistMatches) {
    warnings.push(
      `Pass 2: ${notExistMatches.length} '.to.not.exist' assertion(s) require manual review — Chai accepts null and undefined, Vitest's toBeUndefined() does not. Sites: ${notExistMatches
        .slice(0, 3)
        .join(", ")}${notExistMatches.length > 3 ? "…" : ""}`
    );
  }

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
  readonly force: boolean;
}

function parseCliArgs(argv: readonly string[]): CliArgs {
  const args = new Map<string, string>();
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--in" || flag === "--out") {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error(`Missing value for ${flag}`);
      }
      args.set(flag, value);
      i++;
    } else if (flag === "--force") {
      force = true;
    }
  }
  const inGlob = args.get("--in");
  const outDir = args.get("--out");
  if (!inGlob || !outDir) {
    throw new Error(
      "Usage: migrate-mocha-to-vitest --in <glob> --out <dir> [--force]"
    );
  }
  return { inGlob, outDir, force };
}

/**
 * Compute the longest non-glob prefix of a glob pattern. Used to anchor
 * relative output paths so directory structure is preserved.
 *
 *   `test/commons/**\/*.js`        → `test/commons`
 *   `test/{a,b}/x.js`              → `test`
 *   `packages/foo/test/x/*.js`     → `packages/foo/test/x`
 *   `test/commons/utils/index.js`  → `test/commons/utils/index.js` (literal)
 */
export function globBaseDir(pattern: string): string {
  // Stop at the first path segment containing a glob meta-character.
  const segments = pattern.split("/");
  const literal: string[] = [];
  for (const seg of segments) {
    if (/[*?[\]{}!()]/.test(seg)) break;
    literal.push(seg);
  }
  const joined = literal.join("/");
  return joined === "" ? "." : joined;
}

/**
 * Resolve the input base directory used to anchor relative output paths.
 * Literal files / directories are used as-is; globs use `globBaseDir`.
 */
async function resolveInputBase(input: string): Promise<string> {
  // If the input has no glob meta, treat it as a literal path.
  if (!/[*?[\]{}!()]/.test(input)) {
    try {
      const stat = await fs.stat(input);
      if (stat.isFile()) return path.dirname(path.resolve(input));
      return path.resolve(input);
    } catch {
      // Falls through to glob handling.
    }
  }
  return path.resolve(globBaseDir(input));
}

export interface RunCliOptions {
  readonly cwd?: string;
}

export async function runCli(
  argv: readonly string[],
  options: RunCliOptions = {}
): Promise<void> {
  const { inGlob, outDir, force } = parseCliArgs(argv);
  const cwd = options.cwd ?? process.cwd();

  const resolvedOutDir = path.resolve(cwd, outDir);
  const resolvedInputBase = path.isAbsolute(inGlob)
    ? await resolveInputBase(inGlob)
    : await resolveInputBase(path.resolve(cwd, inGlob));

  if (resolvedInputBase === resolvedOutDir) {
    // eslint-disable-next-line no-console
    console.error(
      `migrate-mocha-to-vitest: --in and --out resolve to the same path (${resolvedOutDir}). Refusing to overwrite sources in place.`
    );
    process.exit(1);
  }

  // Lazy-import glob to keep the unit-test path fast.
  const { glob } = await import("glob");
  const files = await glob(inGlob, { absolute: true, cwd });

  if (files.length === 0) {
    // eslint-disable-next-line no-console
    console.error(`migrate-mocha-to-vitest: no files matched ${inGlob}`);
    process.exit(1);
  }

  await fs.mkdir(resolvedOutDir, { recursive: true });

  // Track output paths so collisions are caught BEFORE any write — even with
  // the relative-path fix, two distinct inputs could still hash to the same
  // output if globBaseDir is too shallow. Better to surface the collision
  // than to silently overwrite.
  const seen = new Map<string, string>();

  for (const file of files) {
    if (/\.test\.ts$/.test(file) && !force) {
      // eslint-disable-next-line no-console
      console.error(
        `migrate-mocha-to-vitest: refusing to re-process already-migrated file ${file} (would produce .test.test.ts). Pass --force to override.`
      );
      process.exit(1);
    }

    const rel = path.relative(resolvedInputBase, file);
    const relRewritten = rel.replace(/\.(?:js|ts)$/, ".test.ts");
    const outPath = path.join(resolvedOutDir, relRewritten);

    const prior = seen.get(outPath);
    if (prior !== undefined) {
      // eslint-disable-next-line no-console
      console.error(
        `migrate-mocha-to-vitest: output collision — both ${prior} and ${file} would write to ${outPath}.`
      );
      process.exit(1);
    }
    seen.set(outPath, file);

    const content = await fs.readFile(file, "utf8");
    const { source, warnings } = migrateFileWithWarnings(content);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
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
