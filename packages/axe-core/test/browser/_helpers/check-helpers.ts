// Browser-pilot helpers — narrow replacement for the legacy
// `test/testutils.js` shim. Used by check and rule-match pilot tests to
// avoid duplicating the same 30 lines of MockCheckContext + getCheckEvaluate
// + checkSetup boilerplate across every file.
//
// IMPORTANT: This is a deliberately TEMPORARY pattern. Sprint 3 (task #10)
// will replace these with direct imports of evaluator functions from
// `lib/checks/<category>/<name>-evaluate.ts`. For Sprint 1 we route through
// the built UMD/ESM bundle (`dist/axe.mjs`) the same way Karma routes
// through `dist/axe.js`, because:
//   1. The pilot's purpose is to validate Vitest Browser Mode + Playwright
//      mechanics (computed-style resolution, fixture lifecycle, parallel
//      isolation), NOT to perfect the import strategy.
//   2. `axe._audit.checks[id]` is fully populated only after the bundle's
//      top-level `load(default_config_default)` runs — re-creating that
//      bootstrap from source for every test would re-implement Grunt.
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.2.
// TODO(Sprint 3 task #10): replace with direct imports from lib/.
//
// We load the UMD bundle for its side effect of registering `globalThis.axe`
// with `_audit` populated. The ESM default export (`axeExport`) intentionally
// omits the `_audit` field, so importing default would not give us access to
// the registered checks.
import '../../../dist/axe.js';
import { afterEach } from 'vitest';

const axe = (globalThis as unknown as { axe: any }).axe;
if (!axe || !axe._audit) {
  throw new Error(
    'check-helpers: globalThis.axe._audit is undefined — the UMD bundle did not initialize.'
  );
}

// Workaround for the project-scoped setupFiles inheritance gap in Vitest 4
// (see ensureFixture below): clear the fixture between tests so DOM state
// doesn't leak.
afterEach(() => {
  const existing = document.getElementById('fixture');
  if (existing) existing.remove();
  (globalThis as { __axeFixture?: HTMLElement }).__axeFixture = undefined;
  axe.teardown?.();
});

export interface MockCheckContext {
  _data: unknown;
  _relatedNodes: unknown[];
  _onAsync: ((result: unknown, ctx: MockCheckContext) => void) | null;
  data(d: unknown): void;
  relatedNodes(nodes: unknown): void;
  async(): (result: unknown) => void;
  reset(): void;
}

export function createMockCheckContext(): MockCheckContext {
  return {
    _data: null,
    _relatedNodes: [],
    _onAsync: null,
    data(d) {
      this._data = d;
    },
    relatedNodes(nodes) {
      this._relatedNodes = Array.isArray(nodes) ? nodes : [nodes];
    },
    async() {
      const self = this;
      return function (result: unknown) {
        self._onAsync?.(result, self);
      };
    },
    reset() {
      this._data = null;
      this._relatedNodes = [];
      this._onAsync = null;
    }
  };
}

/**
 * Returns a wrapped check evaluator. Mirrors `axe.testUtils.getCheckEvaluate`
 * just enough for the pilot — it normalizes options and calls the bundled
 * Check instance's `.evaluate` with the right `this` context.
 */
export function getCheckEvaluate(checkId: string) {
  const audit = (axe as unknown as { _audit: { checks: Record<string, any> } })
    ._audit;
  const check = audit.checks[checkId];
  if (!check) {
    throw new Error(
      `getCheckEvaluate: check id "${checkId}" not registered on axe._audit.checks`
    );
  }
  return function evaluateWrapper(
    this: MockCheckContext,
    node: HTMLElement,
    options: unknown,
    virtualNode: unknown,
    context?: unknown
  ) {
    const opts = check.getOptions(options);
    return check.evaluate.call(this, node, opts, virtualNode, context);
  };
}

/**
 * Inject HTML into the per-test fixture container created by
 * `vitest.setup.ts`, run `axe.setup` so the VTree is built, and return
 * `[node, options, virtualNode]` for the requested target.
 *
 * Mirrors `axe.testUtils.checkSetup`. Pilot only — Sprint 3 will refactor.
 */
/**
 * Resolve the per-test fixture container. The setup file
 * `test/setup/vitest.setup.ts` is supposed to install
 * `globalThis.__axeFixture` via a `beforeEach` hook, but Vitest 4's
 * project-scoped `defineProject({ test: ... })` does NOT inherit the root
 * config's `setupFiles` array (verified empirically — task #4 pilot run).
 * Until the workspace config is fixed in a follow-up commit (task #4 brief
 * forbids modifying setup/config files in this commit), we fall back to
 * creating-or-reusing a `<div id="fixture">` directly. The container is
 * cleared at the start of every `checkSetup` call, so test isolation is
 * preserved even when the global hook didn't fire.
 */
function ensureFixture(): HTMLElement {
  let fixture: HTMLElement | undefined = (
    globalThis as { __axeFixture?: HTMLElement }
  ).__axeFixture;
  if (!fixture || !fixture.isConnected) {
    fixture = document.getElementById('fixture') ?? undefined;
  }
  if (!fixture || !fixture.isConnected) {
    fixture = document.createElement('div');
    fixture.id = 'fixture';
    document.body.appendChild(fixture);
    (globalThis as { __axeFixture?: HTMLElement }).__axeFixture = fixture;
  }
  return fixture;
}

export function checkSetup(
  content: string,
  options: unknown = {},
  target: string = '#target'
): [HTMLElement, unknown, unknown] {
  const fixture = ensureFixture();
  fixture.id = 'fixture'; // some commons code keys off id="fixture"
  fixture.innerHTML = content;
  const utils = (
    axe as unknown as {
      utils: any;
      teardown: () => void;
      setup: (n: Node) => unknown;
    }
  ).utils;
  (axe as unknown as { teardown: () => void }).teardown();
  const rootNode = (axe as unknown as { setup: (n: Node) => unknown }).setup(
    fixture
  ) as { actualNode: HTMLElement };
  const found = utils.querySelectorAll(rootNode, target)[0];
  if (!found) {
    throw new Error(`checkSetup: target "${target}" not found in fixture`);
  }
  return [found.actualNode, options, found];
}

export function queryFixture(html: string, query = '#target') {
  const fixture = ensureFixture();
  fixture.id = 'fixture';
  fixture.innerHTML = html;
  const utils = (
    axe as unknown as {
      utils: any;
      teardown: () => void;
      setup: (n: Node) => unknown;
    }
  ).utils;
  (axe as unknown as { teardown: () => void }).teardown();
  const rootNode = (axe as unknown as { setup: (n: Node) => unknown }).setup(
    fixture
  );
  const vNode = utils.querySelectorAll(rootNode, query)[0];
  if (!vNode) {
    throw new Error(`queryFixture: target "${query}" not found in fixture`);
  }
  return vNode;
}

export { axe };
