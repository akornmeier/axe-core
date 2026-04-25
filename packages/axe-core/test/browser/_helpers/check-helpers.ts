// Browser test helpers — replacement for the legacy `test/testutils.js` shim.
//
// =============================================================================
// Modernization stance (Sprint 3, per user direction)
// =============================================================================
//
// This module replaces `axe.testUtils.*` for migrated tests, but it is NOT a
// 1:1 port. We deliberately keep the surface narrow:
//
//   Kept (used everywhere):
//     - `checkSetup` / `queryFixture` / `fixtureSetup` — fixture mounting
//     - `createMockCheckContext` — ergonomic Check `this`-binding mock
//     - `getCheckEvaluate(id)` — UMD-bundle hybrid (transitional)
//     - `getCheckEvaluateESM(evaluator)` — ESM-direct (preferred for new tests)
//
//   Compatibility-only (avoid in new tests):
//     - `flatTreeSetup`, `shadowCheckSetup`, `queryShadowFixture`, `checks`,
//       `shadowSupport` — these mirror legacy patterns for the bulk codemod
//       output. Prefer `getCheckEvaluateESM` + per-test DOM construction in
//       new tests; rely on Vitest's `beforeEach` fixture container for
//       isolation rather than mutating `axe._tree` / `axe._audit` directly.
//
// Tests that hit the compatibility-only surface and break in non-trivial ways
// are marked `it.todo('FIXME(phase-03-modern): ...')` rather than papered
// over with more helper code. The follow-up work is to rewrite those tests
// against the kept surface.
//
// =============================================================================
// D1 — Canonical evaluator-import pattern (Sprint 3, task #10)
// =============================================================================
//
// Sprint 1 routed every check through the built UMD bundle (`dist/axe.js`) so
// `axe._audit.checks[id]` was populated. PRD-03 §2.3.2 says Sprint 3 should
// move to direct ESM imports of evaluator functions from
// `lib/checks/<category>/<name>-evaluate.ts`. The PRD-01 §4.1 carryover —
// `lib/core/utils/memoize.ts` mutates `axe._memoizedFns` at module top
// level — blocks the pure-ESM path for any evaluator whose import closure
// transitively pulls `commons/` or `core/utils/`. That is most evaluators.
//
// Decision tree for choosing a path in a per-check test file:
//
//   1. Open `lib/checks/<category>/<name>-evaluate.ts`.
//   2. Does it import from `../../core/utils*` or `../../commons/*`?
//        - YES → use `getCheckEvaluate(id)` (UMD-bundle hybrid). The `_audit`
//                lookup is the only thing that survives the memoize global
//                side effect cleanly today.
//        - NO  → use `getCheckEvaluateESM(evaluator, defaultOptions?)`. The
//                evaluator is imported directly from `lib/`, no bundle
//                dependency.
//   3. Once PRD-01 §4.1 closes (memoize converted to a non-side-effect
//      module-local cache), the ESM path becomes the default and the UMD
//      hybrid is deprecated. Each check file flips with a one-line edit.
//
// =============================================================================
//
// We load the UMD bundle for its side effect of registering `globalThis.axe`
// with `_audit` populated. The ESM default export (`axeExport`) intentionally
// omits the `_audit` field, so importing default would not give us access to
// the registered checks.
import '../../../dist/axe.js';

const axe = (globalThis as unknown as { axe: any }).axe;
if (!axe || !axe._audit) {
  throw new Error(
    'check-helpers: globalThis.axe._audit is undefined — the UMD bundle did not initialize.'
  );
}

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
 * UMD-bundle hybrid path. Returns a wrapped check evaluator that resolves
 * the registered `Check` instance from `axe._audit.checks[id]` and forwards
 * the call with the right `this` context and option-resolution semantics.
 *
 * Use this when the evaluator's import closure pulls `commons/` or
 * `core/utils/`, since pure-ESM imports throw under `lib/core/utils/memoize.ts`'s
 * top-level `axe._memoizedFns = []` mutation (PRD-01 §4.1).
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
 * ESM-direct path. Wraps an evaluator imported straight from
 * `lib/checks/<category>/<name>-evaluate.ts`. Replicates `Check#getOptions`
 * locally: caller-supplied options take precedence over `defaultOptions`,
 * and `defaultOptions` defaults to `{}`.
 *
 * Use this when the evaluator does NOT transitively import `commons/` or
 * `core/utils/` (so it does not trip the PRD-01 §4.1 memoize global).
 *
 * @example
 *   import ariaBusyEvaluate from '../../../lib/checks/aria/aria-busy-evaluate';
 *   const checkEvaluate = getCheckEvaluateESM(ariaBusyEvaluate);
 *   expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
 */
export function getCheckEvaluateESM<
  T extends (this: MockCheckContext, ...args: any[]) => any
>(evaluator: T, defaultOptions: Record<string, unknown> = {}) {
  return function evaluateWrapper(
    this: MockCheckContext,
    node: HTMLElement,
    options: unknown,
    virtualNode: unknown,
    context?: unknown
  ): ReturnType<T> {
    const opts =
      options && typeof options === 'object'
        ? { ...defaultOptions, ...(options as Record<string, unknown>) }
        : defaultOptions;
    return evaluator.call(this, node, opts, virtualNode, context);
  };
}

/**
 * Inject HTML into the per-test fixture container created by
 * `vitest.setup.ts`, run `axe.setup` so the VTree is built, and return
 * `[node, options, virtualNode]` for the requested target.
 *
 * Mirrors `axe.testUtils.checkSetup`. The fixture container's lifecycle is
 * owned by `test/setup/vitest.setup.ts`'s `beforeEach`/`afterEach`; this
 * helper just re-uses the per-test instance.
 */
function ensureFixture(): HTMLElement {
  const fixture = (globalThis as { __axeFixture?: HTMLElement }).__axeFixture;
  if (!fixture || !fixture.isConnected) {
    throw new Error(
      'check-helpers: globalThis.__axeFixture is not set. The Vitest setup ' +
        'file (test/setup/vitest.setup.ts) did not run — check that the ' +
        'project in vitest.workspace.ts has setupFiles wired correctly.'
    );
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

/**
 * Inject `content` into the per-test fixture and run `axe.setup()` to build
 * the flat virtual tree. Returns the root virtual node — callers typically
 * read `.children[i]` to walk into the tree.
 *
 * Mirrors the legacy `axe.testUtils.fixtureSetup` semantics. Because the
 * VTree node — not the raw DOM — is the contract, evaluators like
 * `aria-valid-attr-value` get the right view of attributes after `axe.setup`
 * runs.
 */
export function fixtureSetup(content: string | Node | Node[]): any {
  const fixture = ensureFixture();
  fixture.id = 'fixture';
  fixture.innerHTML = '';
  if (typeof content === 'string') {
    fixture.innerHTML = content;
  } else if (content instanceof Node) {
    fixture.appendChild(content);
  } else if (Array.isArray(content)) {
    for (const node of content) fixture.appendChild(node);
  }
  (axe as unknown as { teardown: () => void }).teardown();
  return (axe as unknown as { setup: (n: Node) => unknown }).setup(fixture);
}

/**
 * Build the flattened virtual tree for `content` and stash it on `axe._tree`.
 * Mirrors the legacy `axe.testUtils.flatTreeSetup`. Used by tests that pass
 * a virtual node directly to a check evaluator without going through
 * `checkSetup` / `queryFixture`.
 */
export function flatTreeSetup(content: HTMLElement | string): any[] {
  const utils = (axe as unknown as { utils: any })._audit
    ? (axe as unknown as { utils: any }).utils
    : (axe as unknown as { utils: any }).utils;
  const tree = utils.getFlattenedTree(content);
  (axe as unknown as { _tree: any })._tree = tree;
  return tree;
}

/**
 * Shadow-DOM feature-detection mirroring `axe.testUtils.shadowSupport`. The
 * field is a plain object so callers can read `shadowSupport.v1` /
 * `shadowSupport.v0` at module scope; we evaluate `document.body` lazily
 * because `setup`/`load` ordering means it might not exist at import time
 * in some test files.
 */
export const shadowSupport = {
  get v0(): boolean {
    return (
      typeof document !== 'undefined' &&
      !!document.body &&
      typeof (document.body as any).createShadowRoot === 'function'
    );
  },
  get v1(): boolean {
    return (
      typeof document !== 'undefined' &&
      !!document.body &&
      typeof document.body.attachShadow === 'function'
    );
  }
};

/**
 * Mount light-DOM `content`, then attach a shadow root to either the
 * matched target / `#shadow` host / first child, populate it with
 * `shadowContent`, and return the virtual node for `targetSelector`.
 *
 * Mirrors `axe.testUtils.queryShadowFixture` + `shadowCheckSetup`. Tests
 * that rely on shadow boundaries — focus traversal, accessible-name
 * composition — use this instead of `checkSetup`.
 */
export function queryShadowFixture(
  content: string | Node,
  shadowContent: string | Node,
  targetSelector: string = '#target'
): any {
  const fixture = ensureFixture();
  fixture.id = 'fixture';
  if (typeof content === 'string') {
    fixture.innerHTML = content;
  } else {
    fixture.innerHTML = '';
    fixture.appendChild(content);
  }

  let targetCandidate = fixture.querySelector(
    targetSelector
  ) as HTMLElement | null;
  let container: HTMLElement | null = targetCandidate;
  if (!targetCandidate) {
    container =
      (fixture.querySelector('#shadow') as HTMLElement | null) ??
      (fixture.firstElementChild as HTMLElement | null);
  }
  if (!container) {
    throw new Error(
      'queryShadowFixture: no host element found in light-DOM content'
    );
  }
  const shadowRoot = container.attachShadow({ mode: 'open' });
  if (typeof shadowContent === 'string') {
    shadowRoot.innerHTML = shadowContent;
  } else {
    shadowRoot.appendChild(shadowContent);
  }
  if (!targetCandidate) {
    targetCandidate = shadowRoot.querySelector(
      targetSelector
    ) as HTMLElement | null;
  }
  if (!targetCandidate) {
    throw new Error(
      `queryShadowFixture: target "${targetSelector}" not found in shadow tree`
    );
  }
  const utils = (axe as unknown as { utils: any }).utils;
  (axe as unknown as { teardown: () => void }).teardown();
  const vFixture = (axe as unknown as { setup: (n: Node) => unknown }).setup(
    fixture
  );
  return utils.getNodeFromTree(targetCandidate) ?? vFixture;
}

export function shadowCheckSetup(
  content: string,
  shadowContent: string,
  options: unknown = {},
  targetSelector: string = '#target'
): [HTMLElement, unknown, unknown] {
  const opts = options && typeof options === 'object' ? options : {};
  const node = queryShadowFixture(content, shadowContent, targetSelector);
  return [node.actualNode, opts, node];
}

/**
 * Reference to `axe._audit.checks` so tests can match the legacy
 * `checks.<id>.evaluate(...)` pattern without reaching through `axe`.
 *
 * Prefer `getCheckEvaluate(id)` for new tests — it wraps the evaluator with
 * the same `getOptions` semantics the audit applies. `checks[id]` is exposed
 * for the bulk-migrated suites that called the evaluator without options.
 */
export const checks: Record<string, any> = (
  axe as unknown as { _audit: { checks: Record<string, any> } }
)._audit.checks;

export { axe };
