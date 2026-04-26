/**
 * Unit tests for `migrate-test-utils-destructure`.
 *
 * Coverage matrix mirrors §3-4b-#1 of `specs/phase-05-remaining-work-brief.md`
 * and the goals in `specs/phase-05-execution-plan.md` task #2:
 *
 *   1. Clean destructure (single helper)
 *   2. Clean destructure (multiple helpers)
 *   3. Mixed destructure — one exposed + one blocked → skip
 *   4. Bare access only
 *   5. Mixed bare access + destructure
 *   6. Multiple imports needed (file already has unrelated imports)
 *   7. File already imports from `@helpers/check-helpers` → idempotent merge
 *   8. Idempotency on already-migrated file
 *   9. No-op when no `axe.testUtils` reference present
 *  10. Comment / string containing `axe.testUtils` does NOT trigger rewrite
 *  11. Unknown helper (not in either set) → skip
 *  12. Object-binding rename (`{ foo: bar }`) — surface as helper name
 */

import { describe, expect, it } from "vitest";

import {
  migrateTestUtilsDestructure,
  migrateTestUtilsDestructureSource,
  EXPOSED_HELPERS,
  BLOCKED_HELPERS,
} from "../migrate-test-utils-destructure";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

describe("migrate-test-utils-destructure — Pattern A (destructure)", () => {
  it("rewrites a single-helper destructure into a named import", () => {
    const src = [
      "describe('x', () => {",
      "  const { checkSetup } = axe.testUtils;",
      "  it('works', () => { checkSetup('<div/>'); });",
      "});",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    expect(out).toContain(
      "import { checkSetup } from '@helpers/check-helpers';"
    );
    expect(out).not.toContain("axe.testUtils");
    expect(out).toContain("checkSetup('<div/>')");
  });

  it("rewrites a multi-helper destructure preserving all bound names", () => {
    const src = [
      "const { checkSetup, queryFixture, fixtureSetup } = axe.testUtils;",
      "checkSetup('<a/>');",
      "queryFixture('<b/>');",
      "fixtureSetup('<c/>');",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    expect(norm(out)).toContain(
      "import { checkSetup, fixtureSetup, queryFixture } from '@helpers/check-helpers'"
    );
    expect(out).not.toContain("axe.testUtils");
    // The original calls still reference the bare names.
    expect(out).toContain("checkSetup('<a/>')");
    expect(out).toContain("queryFixture('<b/>')");
    expect(out).toContain("fixtureSetup('<c/>')");
  });

  it("preserves an object-binding rename by importing the source name", () => {
    const src = "const { checkSetup: setup } = axe.testUtils;\nsetup('<x/>');\n";
    const out = migrateTestUtilsDestructureSource(src);
    // We import the *source* helper name; the local alias is dropped because
    // the runtime call still references `setup`. This is intentionally lossy
    // — any file in the 4b candidate set that uses an alias is rare and
    // surfaces a manual cleanup.
    expect(out).toContain(
      "import { checkSetup } from '@helpers/check-helpers';"
    );
  });
});

describe("migrate-test-utils-destructure — Pattern C (single-binding alias)", () => {
  it("drops `const X = axe.testUtils.X;` and imports the helper", () => {
    const src = [
      "const fixtureSetup = axe.testUtils.fixtureSetup;",
      "fixtureSetup('<x/>');",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    expect(out).toContain(
      "import { fixtureSetup } from '@helpers/check-helpers';"
    );
    // The original alias declaration must be removed — otherwise the rewrite
    // produces `const fixtureSetup = fixtureSetup;` (TDZ trap).
    expect(out).not.toMatch(/const\s+fixtureSetup\s*=\s*fixtureSetup\s*;/);
    expect(out).not.toContain("axe.testUtils");
    expect(out).toContain("fixtureSetup('<x/>')");
  });

  it("skips a file where a local binding shadows the import name (chained-property RHS)", () => {
    const src = [
      "const shadowSupport = axe.testUtils.shadowSupport.v1;",
      "if (shadowSupport) { /* ... */ }",
      "",
    ].join("\n");
    const result = migrateTestUtilsDestructure(src);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("shadowSupport");
    expect(result.skipReason).toContain("shadows helper import");
    expect(result.source).toBe(src);
  });

  it("skips a file with non-trivial aliases (`const setup = axe.testUtils.checkSetup`)", () => {
    const src = [
      "const setup = axe.testUtils.checkSetup;",
      "setup('<x/>');",
      "",
    ].join("\n");
    const result = migrateTestUtilsDestructure(src);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("non-trivial alias");
    expect(result.source).toBe(src);
  });
});

describe("migrate-test-utils-destructure — Pattern B (bare access)", () => {
  it("rewrites `axe.testUtils.X(...)` into `X(...)` with a fresh import", () => {
    const src = "axe.testUtils.checkSetup('<div/>');\n";
    const out = migrateTestUtilsDestructureSource(src);
    expect(out).toContain(
      "import { checkSetup } from '@helpers/check-helpers';"
    );
    expect(out).toContain("checkSetup('<div/>');");
    expect(out).not.toContain("axe.testUtils");
  });

  it("dedupes a single helper used in multiple bare accesses", () => {
    const src = [
      "axe.testUtils.checkSetup('<a/>');",
      "axe.testUtils.checkSetup('<b/>');",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    const importMatches = out.match(/from '@helpers\/check-helpers'/g) ?? [];
    expect(importMatches).toHaveLength(1);
    // Both call sites rewritten.
    expect(out.match(/\bcheckSetup\b/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("migrate-test-utils-destructure — mixed shapes", () => {
  it("rewrites bare access AND destructure in the same file", () => {
    const src = [
      "const { fixtureSetup } = axe.testUtils;",
      "axe.testUtils.checkSetup('<div/>');",
      "fixtureSetup('<x/>');",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    expect(out).toContain(
      "import { checkSetup, fixtureSetup } from '@helpers/check-helpers';"
    );
    expect(out).not.toContain("axe.testUtils");
    expect(out).toContain("fixtureSetup('<x/>')");
    expect(out).toContain("checkSetup('<div/>')");
  });
});

describe("migrate-test-utils-destructure — skip behaviour", () => {
  it("skips a file whose destructure mixes exposed + blocked helpers", () => {
    const src = [
      "const { checkSetup, captureError } = axe.testUtils;",
      "captureError(() => checkSetup('<x/>'));",
      "",
    ].join("\n");
    const result = migrateTestUtilsDestructure(src);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("captureError");
    // The source must be returned unchanged.
    expect(result.source).toBe(src);
    expect(result.rewrites).toBe(0);
  });

  it("skips a file that uses a blocker via bare access", () => {
    const src = "axe.testUtils.html('<div/>');\n";
    const result = migrateTestUtilsDestructure(src);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("html");
    expect(result.source).toBe(src);
  });

  it("skips a file that uses an unknown legacy helper", () => {
    const src = "axe.testUtils.someLegacyThing();\n";
    const result = migrateTestUtilsDestructure(src);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("someLegacyThing");
  });
});

describe("migrate-test-utils-destructure — import merging", () => {
  it("preserves unrelated existing imports", () => {
    const src = [
      "import { foo } from 'somewhere-else';",
      "const { checkSetup } = axe.testUtils;",
      "checkSetup('<x/>');",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    expect(out).toContain("import { foo } from 'somewhere-else'");
    expect(out).toContain(
      "import { checkSetup } from '@helpers/check-helpers';"
    );
  });

  it("merges into an existing `@helpers/check-helpers` import", () => {
    const src = [
      "import { axe } from '@helpers/check-helpers';",
      "const { checkSetup, queryFixture } = axe.testUtils;",
      "checkSetup('<a/>');",
      "queryFixture('<b/>');",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    // Single helper-import line that contains all three names.
    const helperImportLines = out
      .split("\n")
      .filter((l) => l.includes("@helpers/check-helpers"));
    expect(helperImportLines).toHaveLength(1);
    const line = helperImportLines[0]!;
    expect(line).toContain("axe");
    expect(line).toContain("checkSetup");
    expect(line).toContain("queryFixture");
  });

  it("does not re-add already-imported helpers (idempotency on partial import)", () => {
    const src = [
      "import { checkSetup } from '@helpers/check-helpers';",
      "axe.testUtils.checkSetup('<x/>');",
      "",
    ].join("\n");
    const out = migrateTestUtilsDestructureSource(src);
    const occurrences = out.match(/\bcheckSetup\b/g) ?? [];
    // The named-import slot + the call site, no duplicates in the import.
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    expect(out.match(/import \{[^}]*checkSetup[^}]*checkSetup/)).toBeNull();
  });
});

describe("migrate-test-utils-destructure — idempotency / no-ops", () => {
  it("is idempotent on an already-migrated file (Pattern A)", () => {
    const src = [
      "import { checkSetup } from '@helpers/check-helpers';",
      "checkSetup('<x/>');",
      "",
    ].join("\n");
    const first = migrateTestUtilsDestructureSource(src);
    const second = migrateTestUtilsDestructureSource(first);
    expect(second).toBe(first);
    // And the first pass was itself a no-op.
    expect(first).toBe(src);
  });

  it("is idempotent on an already-migrated file (Pattern B → A)", () => {
    const src = "axe.testUtils.checkSetup('<x/>');\n";
    const once = migrateTestUtilsDestructureSource(src);
    const twice = migrateTestUtilsDestructureSource(once);
    expect(twice).toBe(once);
  });

  it("is a no-op when `axe.testUtils` is absent", () => {
    const src = "describe('x', () => { it('y', () => { expect(1).toBe(1); }); });\n";
    const result = migrateTestUtilsDestructure(src);
    expect(result.source).toBe(src);
    expect(result.skipped).toBe(false);
    expect(result.rewrites).toBe(0);
    expect(result.addedImports).toEqual([]);
  });

  it("does NOT rewrite `axe.testUtils` mentions inside comments or strings", () => {
    const src = [
      "// historical: axe.testUtils.html() used to live here",
      "const note = 'see axe.testUtils.captureError docs';",
      "describe('x', () => {});",
      "",
    ].join("\n");
    const result = migrateTestUtilsDestructure(src);
    expect(result.skipped).toBe(false);
    expect(result.source).toBe(src);
    expect(result.rewrites).toBe(0);
  });
});

describe("migrate-test-utils-destructure — exported sets are sane", () => {
  it("exposed and blocked helper sets are disjoint", () => {
    for (const name of EXPOSED_HELPERS) {
      expect(BLOCKED_HELPERS.has(name)).toBe(false);
    }
    for (const name of BLOCKED_HELPERS) {
      expect(EXPOSED_HELPERS.has(name)).toBe(false);
    }
  });

  it("exposes the canonical helper names referenced in the brief", () => {
    for (const expected of [
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
    ]) {
      expect(EXPOSED_HELPERS.has(expected)).toBe(true);
    }
  });

  it("blocks the canonical legacy helpers from the brief", () => {
    for (const expected of [
      "captureError",
      "html",
      "assertStylesheet",
      "injectIntoFixture",
      "addStyleSheet",
      "removeStyleSheet",
      "isIE11",
    ]) {
      expect(BLOCKED_HELPERS.has(expected)).toBe(true);
    }
  });
});
