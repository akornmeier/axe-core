/**
 * Unit tests for the Mocha/Chai/Sinon → Vitest codemod.
 *
 * Snippets are intentionally minimal — one rewrite per `it` — so failures
 * point to the exact mapping that broke. The full pilot files are validated
 * separately by manual diff (see Sprint 2 task 6 acceptance criteria).
 */

import { describe, expect, it } from "vitest";

import {
  applyPass1,
  applyPass2,
  migrateFile,
  migrateFileWithWarnings,
} from "../migrate-mocha-to-vitest";

// ---------------------------------------------------------------------------
// Pass 1 — chai BDD `expect(...).to.X` rewrites.
// ---------------------------------------------------------------------------

describe("Pass 1 — chai BDD assertions", () => {
  it("rewrites .to.equal to .toBe", () => {
    expect(applyPass1("expect(x).to.equal(1);")).toBe("expect(x).toBe(1);");
  });

  it("rewrites .to.deep.equal to .toEqual", () => {
    expect(applyPass1("expect(obj).to.deep.equal({ a: 1 });")).toBe(
      "expect(obj).toEqual({ a: 1 });"
    );
  });

  it("rewrites .to.eql to .toEqual", () => {
    expect(applyPass1("expect(a).to.eql(b);")).toBe("expect(a).toEqual(b);");
  });

  it("rewrites .to.not.equal to .not.toBe", () => {
    expect(applyPass1("expect(a).to.not.equal(b);")).toBe(
      "expect(a).not.toBe(b);"
    );
  });

  it("rewrites .to.be.true", () => {
    expect(applyPass1("expect(x).to.be.true;")).toBe("expect(x).toBe(true);");
  });

  it("rewrites .to.be.false", () => {
    expect(applyPass1("expect(x).to.be.false;")).toBe("expect(x).toBe(false);");
  });

  it("rewrites .to.be.null", () => {
    expect(applyPass1("expect(x).to.be.null;")).toBe("expect(x).toBeNull();");
  });

  it("rewrites .to.be.undefined", () => {
    expect(applyPass1("expect(x).to.be.undefined;")).toBe(
      "expect(x).toBeUndefined();"
    );
  });

  it("rewrites .to.be.NaN", () => {
    expect(applyPass1("expect(x).to.be.NaN;")).toBe("expect(x).toBeNaN();");
  });

  it("rewrites .to.exist to .toBeDefined", () => {
    expect(applyPass1("expect(x).to.exist;")).toBe("expect(x).toBeDefined();");
  });

  it("rewrites .to.not.exist to .toBeUndefined", () => {
    expect(applyPass1("expect(x).to.not.exist;")).toBe(
      "expect(x).toBeUndefined();"
    );
  });

  it("rewrites .to.be.a('string') to typeof check", () => {
    expect(applyPass1("expect(x).to.be.a('string');")).toBe(
      "expect(typeof x).toBe('string');"
    );
  });

  it("rewrites .to.be.an('array') to Array.isArray", () => {
    expect(applyPass1("expect(x).to.be.an('array');")).toBe(
      "expect(Array.isArray(x)).toBe(true);"
    );
  });

  it("rewrites .to.be.instanceof(Array) to Array.isArray", () => {
    expect(applyPass1("expect(x).to.be.instanceof(Array);")).toBe(
      "expect(Array.isArray(x)).toBe(true);"
    );
  });

  it("rewrites .to.have.lengthOf to .toHaveLength", () => {
    expect(applyPass1("expect(arr).to.have.lengthOf(3);")).toBe(
      "expect(arr).toHaveLength(3);"
    );
  });

  it("rewrites .to.have.property to .toHaveProperty", () => {
    expect(applyPass1("expect(obj).to.have.property('foo', 1);")).toBe(
      "expect(obj).toHaveProperty('foo', 1);"
    );
  });

  it("rewrites .to.include to .toContain", () => {
    expect(applyPass1("expect(arr).to.include(x);")).toBe(
      "expect(arr).toContain(x);"
    );
  });

  it("rewrites .to.contain to .toContain", () => {
    expect(applyPass1("expect(arr).to.contain(x);")).toBe(
      "expect(arr).toContain(x);"
    );
  });

  it("rewrites .to.match to .toMatch", () => {
    expect(applyPass1("expect(str).to.match(/foo/);")).toBe(
      "expect(str).toMatch(/foo/);"
    );
  });

  it("rewrites .to.throw with arg", () => {
    expect(applyPass1("expect(fn).to.throw('boom');")).toBe(
      "expect(fn).toThrow('boom');"
    );
  });

  it("rewrites bare .to.throw", () => {
    expect(applyPass1("expect(fn).to.throw;")).toBe("expect(fn).toThrow();");
  });
});

// ---------------------------------------------------------------------------
// Pass 1 — chai `assert.*` rewrites.
// ---------------------------------------------------------------------------

describe("Pass 1 — chai assert", () => {
  it("rewrites assert.equal", () => {
    expect(applyPass1("assert.equal(a, b);")).toBe("expect(a).toBe(b);");
  });

  it("rewrites assert.strictEqual", () => {
    expect(applyPass1("assert.strictEqual(a, b);")).toBe("expect(a).toBe(b);");
  });

  it("rewrites assert.deepEqual", () => {
    expect(applyPass1("assert.deepEqual(a, b);")).toBe("expect(a).toEqual(b);");
  });

  it("rewrites assert.isTrue", () => {
    expect(applyPass1("assert.isTrue(x);")).toBe("expect(x).toBe(true);");
  });

  it("rewrites assert.isFalse", () => {
    expect(applyPass1("assert.isFalse(x);")).toBe("expect(x).toBe(false);");
  });

  it("rewrites assert.isNull", () => {
    expect(applyPass1("assert.isNull(x);")).toBe("expect(x).toBeNull();");
  });

  it("rewrites assert.isUndefined", () => {
    expect(applyPass1("assert.isUndefined(x);")).toBe(
      "expect(x).toBeUndefined();"
    );
  });

  it("rewrites assert.isDefined", () => {
    expect(applyPass1("assert.isDefined(x);")).toBe(
      "expect(x).toBeDefined();"
    );
  });

  it("rewrites assert.lengthOf", () => {
    expect(applyPass1("assert.lengthOf(arr, 3);")).toBe(
      "expect(arr).toHaveLength(3);"
    );
  });

  it("rewrites assert.throws (no args)", () => {
    expect(applyPass1("assert.throws(fn);")).toBe("expect(fn).toThrow();");
  });

  it("rewrites assert.throws (with message)", () => {
    expect(applyPass1("assert.throws(fn, 'boom');")).toBe(
      "expect(fn).toThrow('boom');"
    );
  });

  it("rewrites assert.include", () => {
    expect(applyPass1("assert.include(arr, x);")).toBe(
      "expect(arr).toContain(x);"
    );
  });

  it("rewrites assert.match", () => {
    expect(applyPass1("assert.match(str, /foo/);")).toBe(
      "expect(str).toMatch(/foo/);"
    );
  });
});

// ---------------------------------------------------------------------------
// Pass 1 — Mocha lifecycle hooks.
// ---------------------------------------------------------------------------

describe("Pass 1 — Mocha lifecycle hooks", () => {
  it("rewrites before to beforeAll", () => {
    expect(applyPass1("before(() => doThing());")).toBe(
      "beforeAll(() => doThing());"
    );
  });

  it("rewrites after to afterAll", () => {
    expect(applyPass1("after(() => doThing());")).toBe(
      "afterAll(() => doThing());"
    );
  });

  it("leaves beforeEach unchanged", () => {
    expect(applyPass1("beforeEach(() => doThing());")).toBe(
      "beforeEach(() => doThing());"
    );
  });

  it("leaves afterEach unchanged", () => {
    expect(applyPass1("afterEach(() => doThing());")).toBe(
      "afterEach(() => doThing());"
    );
  });
});

// ---------------------------------------------------------------------------
// Pass 1 — Sinon basic rewrites.
// ---------------------------------------------------------------------------

describe("Pass 1 — Sinon basic", () => {
  it("rewrites sinon.spy() to vi.fn()", () => {
    expect(applyPass1("const s = sinon.spy();")).toBe("const s = vi.fn();");
  });

  it("rewrites bare sinon.stub() to vi.fn()", () => {
    expect(applyPass1("const s = sinon.stub();")).toBe("const s = vi.fn();");
  });

  it("rewrites sinon.fake.returns(v)", () => {
    expect(applyPass1("const s = sinon.fake.returns(7);")).toBe(
      "const s = vi.fn().mockReturnValue(7);"
    );
  });

  it("rewrites sinon.fake.resolves(v)", () => {
    expect(applyPass1("const s = sinon.fake.resolves(7);")).toBe(
      "const s = vi.fn().mockResolvedValue(7);"
    );
  });

  it("rewrites sinon.fake.rejects(e)", () => {
    expect(applyPass1("const s = sinon.fake.rejects(e);")).toBe(
      "const s = vi.fn().mockRejectedValue(e);"
    );
  });
});

// ---------------------------------------------------------------------------
// Pass 1 — imports + 'use strict'.
// ---------------------------------------------------------------------------

describe("Pass 1 — imports & directives", () => {
  it("strips 'use strict' directive", () => {
    expect(applyPass1("'use strict';\nconst x = 1;\n")).toBe("const x = 1;\n");
  });

  it("removes ESM chai import", () => {
    expect(applyPass1("import { expect } from 'chai';\nconst x = 1;\n")).toBe(
      "const x = 1;\n"
    );
  });

  it("removes CJS chai destructure require", () => {
    expect(applyPass1("const { expect } = require('chai');\nconst x = 1;\n")).toBe(
      "const x = 1;\n"
    );
  });

  it("rewrites sinon ESM import to vitest vi", () => {
    expect(applyPass1("import sinon from 'sinon';\n")).toBe(
      "import { vi } from 'vitest';\n"
    );
  });

  it("rewrites sinon CJS require to vitest vi", () => {
    expect(applyPass1("const sinon = require('sinon');\n")).toBe(
      "import { vi } from 'vitest';\n"
    );
  });
});

// ---------------------------------------------------------------------------
// Pass 2 — ts-morph AST rewrites.
// ---------------------------------------------------------------------------

describe("Pass 2 — ts-morph", () => {
  it("rewrites sinon.stub(obj, 'fn').returns(v) to vi.spyOn().mockReturnValue", () => {
    const input = "sinon.stub(obj, 'method').returns(7);";
    const { source } = applyPass2(input);
    expect(source).toContain("vi.spyOn(obj, 'method').mockReturnValue(7)");
    expect(source).not.toContain("sinon.stub");
  });

  it("rewrites sinon.stub(...).callsFake(fn) to vi.spyOn().mockImplementation", () => {
    const input = "sinon.stub(obj, 'method').callsFake(() => 1);";
    const { source } = applyPass2(input);
    expect(source).toContain(
      "vi.spyOn(obj, 'method').mockImplementation(() => 1)"
    );
  });

  it("rewrites sinon.stub(...).resolves(v) to vi.spyOn().mockResolvedValue", () => {
    const input = "sinon.stub(obj, 'method').resolves(7);";
    const { source } = applyPass2(input);
    expect(source).toContain("vi.spyOn(obj, 'method').mockResolvedValue(7)");
  });

  it("rewrites sinon.stub(...).rejects(e) to vi.spyOn().mockRejectedValue", () => {
    const input = "sinon.stub(obj, 'method').rejects(err);";
    const { source } = applyPass2(input);
    expect(source).toContain("vi.spyOn(obj, 'method').mockRejectedValue(err)");
  });

  it("rewrites bare sinon.stub(obj, 'fn') to vi.spyOn(...).mockImplementation(() => undefined)", () => {
    const input = "const s = sinon.stub(obj, 'method');";
    const { source } = applyPass2(input);
    expect(source).toContain(
      "vi.spyOn(obj, 'method').mockImplementation(() => undefined)"
    );
  });

  it("rewrites top-level const X = require('foo') to ESM default import", () => {
    const input = `const path = require('path');\nconst x = 1;\n`;
    const { source } = applyPass2(input);
    expect(source).toContain("import path from 'path';");
    expect(source).not.toContain("require('path')");
  });

  it("rewrites top-level destructure require to named ESM import", () => {
    const input = `const { join, sep } = require('path');\n`;
    const { source } = applyPass2(input);
    expect(source).toContain("import { join, sep } from 'path';");
  });

  it("emits warnings for residual chai.* references", () => {
    const input = "const x = chai.use(plugin);";
    const { warnings } = applyPass2(input);
    expect(warnings.some((w) => w.includes("chai.use"))).toBe(true);
  });

  it("emits warnings for residual sinon.* references", () => {
    const input = "sinon.match.any";
    const { warnings } = applyPass2(input);
    expect(warnings.some((w) => w.includes("sinon."))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// End-to-end + passthrough.
// ---------------------------------------------------------------------------

describe("migrateFile — end-to-end", () => {
  it("leaves already-Vitest code unchanged (passthrough)", () => {
    const input = `import { describe, expect, it } from 'vitest';

describe('passthrough', () => {
  it('works', () => {
    expect(1).toBe(1);
  });
});
`;
    expect(migrateFile(input)).toBe(input);
  });

  it("migrates a small mocha+chai snippet", () => {
    const input = `'use strict';
import { expect } from 'chai';

describe('thing', function () {
  before(function () {
    setup();
  });
  it('works', function () {
    expect(x).to.equal(1);
    expect(y).to.be.true;
    assert.lengthOf(z, 3);
  });
});
`;
    const out = migrateFile(input);
    expect(out).not.toContain("'use strict'");
    expect(out).not.toContain("from 'chai'");
    expect(out).toContain("beforeAll(");
    expect(out).toContain("expect(x).toBe(1)");
    expect(out).toContain("expect(y).toBe(true)");
    expect(out).toContain("expect(z).toHaveLength(3)");
  });

  it("migrateFileWithWarnings exposes Pass 2 warnings", () => {
    const input = "const x = chai.foo;";
    const { warnings } = migrateFileWithWarnings(input);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
