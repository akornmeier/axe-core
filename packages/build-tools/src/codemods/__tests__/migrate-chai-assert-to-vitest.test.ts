/**
 * Unit tests for the chai `assert.*` → Vitest `expect(...)` codemod.
 *
 * Snippets are intentionally minimal — one rewrite per `it` — so failures
 * point to the exact mapping that broke.
 */

import { describe, expect, it } from "vitest";

import {
  migrateChaiAssert,
  migrateChaiAssertSource as _migrateChaiAssertSource,
  stripChaiAssertFixme,
  ensureVitestImport,
  ensureHelpersImport,
} from "../migrate-chai-assert-to-vitest";

/**
 * Wrap the public `migrateChaiAssertSource` to strip the auto-injected
 * vitest import line. The single-line rewrite tests assert against a
 * specific output shape; the import-injection has its own dedicated tests.
 */
const migrateChaiAssertSource = (input: string): string => {
  const out = _migrateChaiAssertSource(input);
  return out
    .replace(/^import\s*\{[^}]*\}\s*from\s*['"]vitest['"];?\s*\n/, "")
    .replace(
      /^import\s*\{[^}]*\}\s*from\s*['"]@helpers\/check-helpers['"];?\s*\n/,
      ""
    );
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

describe("stripChaiAssertFixme", () => {
  it("removes the entire FIXME line when chai-assert is the only blocker", () => {
    const src = `// FIXME(phase-3-sprint-4b): codemod blocker — uses chai-style 'assert.*' (codemod did not convert)\ndescribe('x', () => {});\n`;
    expect(stripChaiAssertFixme(src)).toBe("describe('x', () => {});\n");
  });

  it("preserves non-chai blockers and drops only the chai clause", () => {
    const src = `// FIXME(phase-3-sprint-4b): codemod blocker — uses axe._tree (internal state); uses chai-style 'assert.*' (codemod did not convert)\ndescribe('x', () => {});\n`;
    const out = stripChaiAssertFixme(src);
    expect(out.startsWith("// FIXME")).toBe(true);
    expect(out).not.toContain("chai-style");
    expect(out).toContain("axe._tree");
  });

  it("also strips the bare-assert clause", () => {
    const src = `// FIXME(phase-3-sprint-4b): codemod blocker — uses chai-style 'assert.*' (codemod did not convert); uses chai-style 'assert(...)' (codemod did not convert)\nfoo();\n`;
    const out = stripChaiAssertFixme(src);
    expect(out).toBe("foo();\n");
  });

  it("is a no-op for files without the FIXME header", () => {
    const src = `describe('x', () => {});\n`;
    expect(stripChaiAssertFixme(src)).toBe(src);
  });
});

describe("migrateChaiAssert — common assertions", () => {
  it("rewrites assert.isTrue", () => {
    const out = migrateChaiAssertSource("assert.isTrue(x);");
    expect(norm(out)).toBe("expect(x).toBe(true);");
  });

  it("rewrites assert.isFalse", () => {
    expect(norm(migrateChaiAssertSource("assert.isFalse(x);"))).toBe(
      "expect(x).toBe(false);"
    );
  });

  it("rewrites assert.isFunction", () => {
    expect(norm(migrateChaiAssertSource("assert.isFunction(fn);"))).toBe(
      "expect(typeof fn).toBe('function');"
    );
  });

  it("rewrites assert.equal (loose) to .toBe", () => {
    expect(norm(migrateChaiAssertSource("assert.equal(a, b);"))).toBe(
      "expect(a).toBe(b);"
    );
  });

  it("rewrites assert.deepEqual to .toEqual", () => {
    expect(
      norm(migrateChaiAssertSource("assert.deepEqual(a, { x: 1 });"))
    ).toBe("expect(a).toEqual({ x: 1 });");
  });

  it("rewrites assert.lengthOf to .toHaveLength", () => {
    expect(norm(migrateChaiAssertSource("assert.lengthOf(arr, 3);"))).toBe(
      "expect(arr).toHaveLength(3);"
    );
  });

  it("rewrites assert.instanceOf to .toBeInstanceOf", () => {
    expect(
      norm(migrateChaiAssertSource("assert.instanceOf(obj, Cls);"))
    ).toBe("expect(obj).toBeInstanceOf(Cls);");
  });

  it("rewrites assert.property to .toHaveProperty", () => {
    expect(
      norm(migrateChaiAssertSource("assert.property(obj, 'foo');"))
    ).toBe("expect(obj).toHaveProperty('foo');");
  });

  it("rewrites assert.notProperty to .not.toHaveProperty", () => {
    expect(
      norm(migrateChaiAssertSource("assert.notProperty(obj, 'foo');"))
    ).toBe("expect(obj).not.toHaveProperty('foo');");
  });

  it("rewrites assert.isAbove / isAtLeast / isBelow / isAtMost", () => {
    expect(norm(migrateChaiAssertSource("assert.isAbove(a, b);"))).toBe(
      "expect(a).toBeGreaterThan(b);"
    );
    expect(norm(migrateChaiAssertSource("assert.isAtLeast(a, b);"))).toBe(
      "expect(a).toBeGreaterThanOrEqual(b);"
    );
    expect(norm(migrateChaiAssertSource("assert.isBelow(a, b);"))).toBe(
      "expect(a).toBeLessThan(b);"
    );
    expect(norm(migrateChaiAssertSource("assert.isAtMost(a, b);"))).toBe(
      "expect(a).toBeLessThanOrEqual(b);"
    );
  });

  it("rewrites assert.closeTo with absolute delta semantics", () => {
    expect(
      norm(migrateChaiAssertSource("assert.closeTo(width, 100, 5);"))
    ).toBe("expect(Math.abs(width - 100)).toBeLessThanOrEqual(5);");
  });

  it("rewrites assert.throws", () => {
    expect(norm(migrateChaiAssertSource("assert.throws(fn);"))).toBe(
      "expect(fn).toThrow();"
    );
    expect(norm(migrateChaiAssertSource("assert.throws(fn, /bad/);"))).toBe(
      "expect(fn).toThrow(/bad/);"
    );
  });

  it("rewrites assert.doesNotThrow", () => {
    expect(norm(migrateChaiAssertSource("assert.doesNotThrow(fn);"))).toBe(
      "expect(fn).not.toThrow();"
    );
  });

  it("rewrites bare assert(value)", () => {
    expect(norm(migrateChaiAssertSource("assert(x === y);"))).toBe(
      "expect(x === y).toBeTruthy();"
    );
  });

  it("rewrites bare assert(value, msg) by stripping the message", () => {
    expect(norm(migrateChaiAssertSource("assert(ok, 'should be ok');"))).toBe(
      "expect(ok).toBeTruthy();"
    );
  });
});

describe("migrateChaiAssert — message-arg stripping", () => {
  it("strips trailing string-literal messages", () => {
    expect(
      norm(migrateChaiAssertSource("assert.equal(a, b, 'they should match');"))
    ).toBe("expect(a).toBe(b);");
  });

  it("strips trailing template-literal messages", () => {
    expect(
      norm(
        migrateChaiAssertSource(
          "assert.equal(a, b, `mismatched: ${a} vs ${b}`);"
        )
      )
    ).toBe("expect(a).toBe(b);");
  });

  it("warns on non-message extra arg rather than silently dropping", () => {
    const result = migrateChaiAssert("assert.equal(a, b, c);");
    // Cannot safely strip a non-string trailing arg → leave call alone.
    expect(result.source).toContain("assert.equal");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("migrateChaiAssert — unhandled methods", () => {
  it("reports unrecognized assert.* methods without dropping them", () => {
    const src = "assert.weirdNew(x, y);";
    const result = migrateChaiAssert(src);
    expect(result.source).toBe(src);
    expect(result.unhandled).toContain("weirdNew");
    expect(result.rewriteCount).toBe(0);
  });
});

describe("migrateChaiAssert — full file", () => {
  it("strips header and rewrites every supported call in one pass", () => {
    const src = `// FIXME(phase-3-sprint-4b): codemod blocker — uses chai-style 'assert.*' (codemod did not convert)
describe('x', () => {
  it('does the thing', () => {
    assert.isFunction(fn);
    assert.equal(a, b, 'should match');
    assert.lengthOf(arr, 0);
    assert.deepEqual(obj, { x: 1 });
  });
});
`;
    const result = migrateChaiAssert(src);
    expect(result.source).not.toContain("FIXME(phase-3-sprint-4b)");
    expect(result.source).toContain("expect(typeof fn).toBe('function')");
    expect(result.source).toContain("expect(a).toBe(b)");
    expect(result.source).toContain("expect(arr).toHaveLength(0)");
    expect(result.source).toContain("expect(obj).toEqual({ x: 1 })");
    expect(result.rewriteCount).toBe(4);
    expect(result.warnings).toEqual([]);
  });

  it("handles nested-paren arguments correctly", () => {
    const src =
      "assert.equal(fn(a, b), other(c, d));";
    const result = migrateChaiAssert(src);
    expect(result.source).toContain("expect(fn(a, b)).toBe(other(c, d))");
  });

  it("preserves expect(...).to* calls untouched", () => {
    const src = "expect(x).toBe(1); assert.equal(a, b);";
    const result = migrateChaiAssert(src);
    expect(result.source).toContain("expect(x).toBe(1)");
    expect(result.source).toContain("expect(a).toBe(b)");
  });
});

describe("ensureVitestImport", () => {
  it("adds the import when describe/it/expect are referenced and no vitest import exists", () => {
    const src = "describe('x', () => { expect(1).toBe(1); });";
    const out = ensureVitestImport(src);
    expect(out.startsWith("import {")).toBe(true);
    expect(out).toContain("from 'vitest'");
    expect(out).toContain(src);
  });

  it("is a no-op when a vitest import already exists", () => {
    const src =
      "import { describe, it } from 'vitest';\ndescribe('x', () => {});";
    expect(ensureVitestImport(src)).toBe(src);
  });

  it("is a no-op when no vitest API is referenced", () => {
    const src = "const x = 1;";
    expect(ensureVitestImport(src)).toBe(src);
  });

  it("is wired into migrateChaiAssert", () => {
    const result = migrateChaiAssert(
      "describe('x', () => { it('y', () => { assert.isTrue(z); }); });"
    );
    expect(result.source).toContain("from 'vitest'");
    expect(result.source).toContain("expect(z).toBe(true)");
  });
});

describe("ensureHelpersImport", () => {
  it("adds the helpers import when axe.X is referenced", () => {
    const src = "describe('x', () => { axe.utils.foo(); });";
    const out = ensureHelpersImport(src);
    expect(out).toContain("from '@helpers/check-helpers'");
    expect(out).toContain("axe.utils.foo()");
  });

  it("is a no-op when @helpers/check-helpers is already imported", () => {
    const src =
      "import { axe } from '@helpers/check-helpers';\naxe.utils.foo();";
    expect(ensureHelpersImport(src)).toBe(src);
  });

  it("is a no-op when no axe.X is referenced", () => {
    const src = "const x = 1;";
    expect(ensureHelpersImport(src)).toBe(src);
  });

  it("is wired into migrateChaiAssert", () => {
    const result = migrateChaiAssert(
      "describe('x', () => { axe.utils.foo(); assert.isTrue(z); });"
    );
    expect(result.source).toContain("from '@helpers/check-helpers'");
    expect(result.source).toContain("from 'vitest'");
  });
});
