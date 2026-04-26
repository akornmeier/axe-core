/**
 * Unit tests for the module-scope fixture → per-test beforeEach codemod.
 *
 * Each test isolates one piece of the rewrite contract so failures point at
 * the exact behaviour that broke. Mirrors the layout of
 * `migrate-chai-assert-to-vitest.test.ts`.
 */

import { describe, expect, it } from "vitest";

import {
  ensureBeforeEachImport,
  migrateModuleScopeFixture,
  migrateModuleScopeFixtureSource,
  stripFixtureFixme,
} from "../migrate-module-scope-fixture";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

describe("stripFixtureFixme", () => {
  it("removes the fixture-lookup FIXME header", () => {
    const src = `// FIXME(phase-3-sprint-4b): codemod blocker — fixture lookup at module top level (Path-B test setup)\ndescribe('x', () => {});\n`;
    expect(stripFixtureFixme(src)).toBe("describe('x', () => {});\n");
  });

  it("is a no-op when the FIXME line is absent", () => {
    const src = "describe('x', () => {});\n";
    expect(stripFixtureFixme(src)).toBe(src);
  });

  it("does not strip an unrelated FIXME header", () => {
    const src = `// FIXME(phase-3-sprint-4b): codemod blocker — uses sinon\ndescribe('x', () => {});\n`;
    expect(stripFixtureFixme(src)).toBe(src);
  });
});

describe("ensureBeforeEachImport", () => {
  it("extends an existing vitest import to include beforeEach", () => {
    const src = `import { describe, it, expect } from 'vitest';\ndescribe('x', () => {});`;
    const out = ensureBeforeEachImport(src);
    expect(out).toContain("beforeEach");
    expect(out).toContain("from 'vitest'");
    expect(out.match(/from\s+['"]vitest['"]/g)?.length).toBe(1);
  });

  it("is a no-op when beforeEach is already imported", () => {
    const src = `import { beforeEach, describe, it } from 'vitest';\ndescribe('x', () => {});`;
    expect(ensureBeforeEachImport(src)).toBe(src);
  });

  it("adds a fresh vitest import when none exists and a vitest API is referenced", () => {
    const src = `describe('x', () => { beforeEach(() => {}); });`;
    const out = ensureBeforeEachImport(src);
    expect(out.startsWith("import {")).toBe(true);
    expect(out).toContain("beforeEach");
    expect(out).toContain("from 'vitest'");
  });

  it("is a no-op for files that don't reference any vitest API", () => {
    const src = "const x = 1;";
    expect(ensureBeforeEachImport(src)).toBe(src);
  });
});

describe("migrateModuleScopeFixture — basic rewrites", () => {
  it("rewrites a top-level `const fixture = document.querySelector('#fixture');` capture", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', () => {
  const fixture = document.querySelector('#fixture');
  it('does X', () => {
    fixture.innerHTML = '<div></div>';
  });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(1);
    expect(result.source).toContain("let fixture: HTMLElement;");
    expect(result.source).toContain("beforeEach(() => {");
    expect(result.source).toContain(
      "fixture = document.getElementById('fixture') as HTMLElement;"
    );
    // The legacy capture is gone.
    expect(result.source).not.toContain(
      "document.querySelector('#fixture')"
    );
    // beforeEach gets imported.
    expect(/import\s*\{[^}]*\bbeforeEach\b[^}]*\}\s*from\s*['"]vitest['"]/.test(
      result.source
    )).toBe(true);
  });

  it("also handles `var fixture = document.getElementById('fixture');`", () => {
    const src = `import { describe, it } from 'vitest';
describe('bar', function () {
  var fixture = document.getElementById('fixture');
  it('does Y', function () {
    fixture.innerHTML = '<div></div>';
  });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(1);
    expect(result.source).toContain("let fixture: HTMLElement;");
    expect(result.source).not.toMatch(
      /var\s+fixture\s*=\s*document\.getElementById/
    );
  });

  it("preserves multiple fixture references inside the describe", () => {
    const src = `import { describe, it } from 'vitest';
describe('baz', () => {
  const fixture = document.getElementById('fixture');
  it('one', () => { fixture.innerHTML = 'a'; });
  it('two', () => { fixture.appendChild(document.createElement('div')); });
  it('three', () => { expect(fixture).not.toBeNull(); });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(1);
    // All three fixture references survive untouched.
    expect(result.source).toContain("fixture.innerHTML = 'a'");
    expect(result.source).toContain("fixture.appendChild");
    expect(result.source).toContain("expect(fixture).not.toBeNull()");
  });

  it("strips the FIXME header when present", () => {
    const src = `// FIXME(phase-3-sprint-4b): codemod blocker — fixture lookup at module top level (Path-B test setup)
import { describe, it } from 'vitest';
describe('foo', () => {
  const fixture = document.querySelector('#fixture');
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.source).not.toContain("FIXME(phase-3-sprint-4b)");
    expect(result.rewriteCount).toBe(1);
  });
});

describe("migrateModuleScopeFixture — nested describes", () => {
  it("only rewrites the immediate parent describe of the capture", () => {
    const src = `import { describe, it } from 'vitest';
describe('outer', () => {
  describe('inner', () => {
    const fixture = document.querySelector('#fixture');
    it('does X', () => { fixture.innerHTML = ''; });
  });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(1);
    // Only ONE let fixture declaration — in the inner describe.
    const declMatches = result.source.match(/let fixture: HTMLElement;/g);
    expect(declMatches?.length).toBe(1);
    // Only ONE beforeEach.
    const beforeEachMatches = result.source.match(/beforeEach\(/g);
    expect(beforeEachMatches?.length).toBe(1);
  });

  it("handles two sibling describes each with their own capture", () => {
    const src = `import { describe, it } from 'vitest';
describe('a', () => {
  const fixture = document.getElementById('fixture');
  it('one', () => { fixture.innerHTML = ''; });
});
describe('b', () => {
  const fixture = document.querySelector('#fixture');
  it('two', () => { fixture.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(2);
    expect(result.source.match(/let fixture: HTMLElement;/g)?.length).toBe(2);
    expect(result.source.match(/beforeEach\(/g)?.length).toBe(2);
  });
});

describe("migrateModuleScopeFixture — beforeEach merging", () => {
  it("prepends the fixture assignment into an existing beforeEach", () => {
    const src = `import { beforeEach, describe, it } from 'vitest';
describe('foo', () => {
  const fixture = document.getElementById('fixture');
  beforeEach(() => {
    document.body.classList.add('test');
  });
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(1);
    // No second beforeEach was emitted.
    expect(result.source.match(/beforeEach\(/g)?.length).toBe(1);
    expect(result.source).toContain("let fixture: HTMLElement;");
    // The existing body line survives.
    expect(result.source).toContain("document.body.classList.add('test')");
    // The fixture assignment lands BEFORE the existing line.
    const assignIdx = result.source.indexOf(
      "fixture = document.getElementById('fixture') as HTMLElement;"
    );
    const classListIdx = result.source.indexOf(
      "document.body.classList.add('test')"
    );
    expect(assignIdx).toBeGreaterThan(0);
    expect(classListIdx).toBeGreaterThan(assignIdx);
  });

  it("handles a function-expression beforeEach (legacy mocha style)", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', function () {
  var fixture = document.getElementById('fixture');
  beforeEach(function () {
    window.__setup = true;
  });
  it('does X', function () { fixture.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(1);
    expect(result.source.match(/beforeEach\(/g)?.length).toBe(1);
    expect(result.source).toContain(
      "fixture = document.getElementById('fixture') as HTMLElement;"
    );
    expect(result.source).toContain("window.__setup = true");
  });
});

describe("migrateModuleScopeFixture — idempotency", () => {
  it("is a true no-op on its own output", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', () => {
  const fixture = document.querySelector('#fixture');
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const once = migrateModuleScopeFixture(src).source;
    const twice = migrateModuleScopeFixture(once).source;
    expect(twice).toBe(once);
  });

  it("does not duplicate the let-decl when re-run", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', () => {
  const fixture = document.getElementById('fixture');
  beforeEach(() => { window.__setup = true; });
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const once = migrateModuleScopeFixture(src).source;
    const twice = migrateModuleScopeFixture(once).source;
    expect(twice).toBe(once);
    expect(twice.match(/let fixture: HTMLElement;/g)?.length).toBe(1);
  });
});

describe("migrateModuleScopeFixture — no-op cases", () => {
  it("leaves files without #fixture lookups untouched", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', () => {
  it('does X', () => { expect(1).toBe(1); });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(0);
    expect(result.source).toBe(src);
  });

  it("leaves describes that capture an unrelated id alone", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', () => {
  const target = document.getElementById('not-fixture');
  it('does X', () => { target.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(0);
    expect(result.source).toBe(src);
  });

  it("warns and leaves destructured fixture bindings alone", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', () => {
  const { fixture } = setup();
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(0);
    expect(result.source).toBe(src);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("destructured");
  });
});

describe("migrateModuleScopeFixture — vitest import injection", () => {
  it("adds a vitest import (with beforeEach) when one is missing", () => {
    const src = `describe('foo', () => {
  const fixture = document.querySelector('#fixture');
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.rewriteCount).toBe(1);
    expect(result.source).toMatch(
      /import\s*\{[^}]*\bbeforeEach\b[^}]*\}\s*from\s*['"]vitest['"]/
    );
  });

  it("merges beforeEach into an existing vitest import without duplicating it", () => {
    const src = `import { describe, expect, it } from 'vitest';
describe('foo', () => {
  const fixture = document.getElementById('fixture');
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const result = migrateModuleScopeFixture(src);
    expect(result.source.match(/from\s+['"]vitest['"]/g)?.length).toBe(1);
    expect(result.source).toMatch(
      /import\s*\{[^}]*\bbeforeEach\b[^}]*\bdescribe\b[^}]*\}\s*from\s*['"]vitest['"]/
    );
  });
});

describe("migrateModuleScopeFixtureSource", () => {
  it("returns just the rewritten source string", () => {
    const src = `import { describe, it } from 'vitest';
describe('foo', () => {
  const fixture = document.querySelector('#fixture');
  it('does X', () => { fixture.innerHTML = ''; });
});
`;
    const out = migrateModuleScopeFixtureSource(src);
    expect(typeof out).toBe("string");
    expect(norm(out)).toContain("let fixture: HTMLElement");
    expect(norm(out)).toContain("beforeEach(() =>");
  });
});
