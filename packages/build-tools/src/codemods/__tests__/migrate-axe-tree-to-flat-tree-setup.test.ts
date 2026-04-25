/**
 * Unit tests for the `axe._tree =` → `flatTreeSetup(…)` codemod.
 *
 * The codemod runs on 42 `.test.ts.todo` files that the original Sprint 4b
 * codemod stamped with the `uses axe._tree (internal state)` blocker. Each
 * pattern below corresponds to a real shape observed in those files.
 */

import { describe, expect, it } from 'vitest';

import { migrateSource } from '../migrate-axe-tree-to-flat-tree-setup';

describe('migrate-axe-tree-to-flat-tree-setup', () => {
  it('rewrites a bare `axe._tree = axe.utils.getFlattenedTree(…)`', () => {
    const input = [
      'describe("foo", () => {',
      '  it("bar", () => {',
      '    axe._tree = axe.utils.getFlattenedTree(fixture);',
      '    const node = fixture.querySelector("a");',
      '    expect(axe.commons.dom.isSkipLink(node)).toBe(true);',
      '  });',
      '});',
      ''
    ].join('\n');
    const { source, rewrites, importAdded } = migrateSource(input);
    expect(rewrites).toBe(1);
    expect(importAdded).toBe(true);
    // The helpers import bundles `axe` (file references it) and
    // `flatTreeSetup`. Order: `axe` before `flatTreeSetup` so the import
    // matches the canonical post-migration shape.
    expect(source).toContain(
      "import { axe, flatTreeSetup } from '@helpers/check-helpers';"
    );
    // `describe`/`it`/`expect` are bare globals in the legacy file → vitest
    // import pulls them in.
    expect(source).toMatch(
      /import\s*\{[^}]*\b(?:describe|it|expect)\b[^}]*\}\s*from\s*'vitest'/
    );
    expect(source).toContain('flatTreeSetup(fixture);');
    expect(source).not.toContain(
      'axe._tree = axe.utils.getFlattenedTree(fixture)'
    );
  });

  it('rewrites the parenthesised init form', () => {
    const input = [
      'it("bar", () => {',
      '  const tree = (axe._tree = axe.utils.getFlattenedTree(fixture.firstChild));',
      '  expect(tree).toBeDefined();',
      '});',
      ''
    ].join('\n');
    const { source, rewrites } = migrateSource(input);
    expect(rewrites).toBe(1);
    expect(source).toContain(
      'const tree = flatTreeSetup(fixture.firstChild);'
    );
  });

  it('rewrites the chained `treeRoot = axe._tree = …` form', () => {
    const input = [
      'beforeEach(() => {',
      '  treeRoot = axe._tree = axe.utils.getFlattenedTree(document);',
      '});',
      ''
    ].join('\n');
    const { source, rewrites } = migrateSource(input);
    expect(rewrites).toBe(1);
    expect(source).toContain('treeRoot = flatTreeSetup(document);');
    expect(source).not.toContain('axe._tree =');
  });

  it('rewrites with `document.documentElement` as the argument', () => {
    const input = [
      'it("ok", () => {',
      '  axe._tree = axe.utils.getFlattenedTree(document.documentElement);',
      '});',
      ''
    ].join('\n');
    const { source, rewrites } = migrateSource(input);
    expect(rewrites).toBe(1);
    expect(source).toContain('flatTreeSetup(document.documentElement);');
  });

  it('handles a destructured `var getFlattenedTree = axe.utils.getFlattenedTree`', () => {
    const input = [
      'describe("foo", () => {',
      '  var getFlattenedTree = axe.utils.getFlattenedTree;',
      '  it("ok", () => {',
      '    axe._tree = getFlattenedTree(fixture);',
      '  });',
      '});',
      ''
    ].join('\n');
    const { source, rewrites, importAdded } = migrateSource(input);
    expect(rewrites).toBe(1);
    expect(importAdded).toBe(true);
    expect(source).not.toContain('var getFlattenedTree');
    expect(source).toContain('flatTreeSetup(fixture);');
    expect(source).toContain(
      "import { flatTreeSetup } from '@helpers/check-helpers';"
    );
  });

  it('leaves `axe._tree = undefined` / `null` / `[vNode]` literal seeds in place', () => {
    const input = [
      'beforeEach(() => {',
      '  axe._tree = undefined;',
      '});',
      'afterEach(() => {',
      '  axe._tree = null;',
      '});',
      'it("seeds vNode", () => {',
      '  axe._tree = [vNode];',
      '});',
      ''
    ].join('\n');
    const { source, rewrites, warnings } = migrateSource(input);
    expect(rewrites).toBe(0);
    expect(source).toContain('axe._tree = undefined;');
    expect(source).toContain('axe._tree = null;');
    expect(source).toContain('axe._tree = [vNode];');
    expect(
      warnings.some((w) => w.includes('literal-seed assignment'))
    ).toBe(true);
  });

  it('preserves leading FIXME comment when adding a new import', () => {
    const input = [
      '// FIXME(phase-3-sprint-4b): codemod blocker — uses axe._tree (internal state)',
      'describe("foo", () => {',
      '  it("ok", () => {',
      '    axe._tree = axe.utils.getFlattenedTree(fixture);',
      '  });',
      '});',
      ''
    ].join('\n');
    const { source } = migrateSource(input);
    const lines = source.split('\n');
    // FIXME line should still be at the top.
    expect(lines[0]).toContain('FIXME(phase-3-sprint-4b)');
    // import sits after the comment, before the describe.
    const importIdx = lines.findIndex((l) =>
      l.includes("from '@helpers/check-helpers'")
    );
    const describeIdx = lines.findIndex((l) => l.startsWith('describe('));
    expect(importIdx).toBeGreaterThan(0);
    expect(importIdx).toBeLessThan(describeIdx);
  });

  it('merges flatTreeSetup into an existing helpers import', () => {
    const input = [
      "import { axe } from '@helpers/check-helpers';",
      'it("ok", () => {',
      '  axe._tree = axe.utils.getFlattenedTree(fixture);',
      '});',
      ''
    ].join('\n');
    const { source, importAdded } = migrateSource(input);
    expect(importAdded).toBe(true);
    expect(source).toContain(
      "import { axe, flatTreeSetup } from '@helpers/check-helpers';"
    );
    // Should not have a second import line for the helpers module.
    const matches = source.match(/from '@helpers\/check-helpers'/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('is idempotent — re-running on already-migrated output is a no-op', () => {
    const input = [
      "import { it } from 'vitest';",
      "import { flatTreeSetup } from '@helpers/check-helpers';",
      'it("ok", () => {',
      '  flatTreeSetup(fixture);',
      '});',
      ''
    ].join('\n');
    const { source, rewrites, importAdded } = migrateSource(input);
    expect(rewrites).toBe(0);
    expect(importAdded).toBe(false);
    expect(source).toBe(input);
  });

  it('rewrites multiple assignments in the same file', () => {
    const input = [
      'it("a", () => {',
      '  axe._tree = axe.utils.getFlattenedTree(a);',
      '});',
      'it("b", () => {',
      '  axe._tree = axe.utils.getFlattenedTree(b);',
      '});',
      ''
    ].join('\n');
    const { rewrites, source } = migrateSource(input);
    expect(rewrites).toBe(2);
    expect(source).toContain('flatTreeSetup(a);');
    expect(source).toContain('flatTreeSetup(b);');
  });

  it('still adds axe + vitest imports for files where every axe._tree use is a read', () => {
    // Tests that ONLY read `axe._tree[0]` (the seeding happened via
    // `axe.testUtils.fixtureSetup` or similar) still need the helpers /
    // vitest imports for the migrated file to load — Karma's ambient
    // globals are not present under Vitest's browser project.
    const input = [
      'describe("readonly", () => {',
      '  it("reads", () => {',
      '    const node = axe.utils.querySelectorAll(axe._tree[0], "input")[0];',
      '    expect(node).toBeDefined();',
      '  });',
      '});',
      ''
    ].join('\n');
    const { source, rewrites, importAdded, warnings } = migrateSource(input);
    expect(rewrites).toBe(0);
    expect(importAdded).toBe(true);
    expect(source).toContain(
      "import { axe } from '@helpers/check-helpers';"
    );
    expect(source).toMatch(
      /import\s*\{[^}]*\bdescribe\b[^}]*\}\s*from\s*'vitest'/
    );
    // We do NOT add a `flatTreeSetup` import — there's no rewrite to
    // justify it, and including it would be unused.
    expect(source).not.toContain('flatTreeSetup');
    expect(
      warnings.some((w) => w.includes('no axe._tree=getFlattenedTree'))
    ).toBe(true);
  });
});
