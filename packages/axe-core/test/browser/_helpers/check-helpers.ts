// Browser test helpers — replacement for the legacy `test/testutils.js` shim.
//
// =============================================================================
// Modernization stance (Sprint 5, #16-A — ESM-direct status)
// =============================================================================
//
// As of Sprint 5 #16-A the UMD-bundle import (`dist/axe.js`) is gone. We import
// the ESM default export from `lib/index` directly. Module-evaluation order:
//
//   1. `init-axe-global` runs first (initializes `globalThis.axe ??= {}`),
//      giving `lib/core/public/load.ts`'s `axe._audit = …` write a target.
//   2. `lib/index` evaluates, populates `axeExport` AND `Object.assign`s into
//      `globalThis.axe`, then calls `load(defaultConfig)` which sets
//      `globalThis.axe._audit`.
//   3. We re-export the ESM default as `axe` (typed `any` to keep callers
//      such as `axe.run`, `axe.configure`, `axe._audit` working without a
//      bigger refactor).
//
//   Kept (used everywhere):
//     - `checkSetup` / `queryFixture` / `fixtureSetup` — fixture mounting
//     - `createMockCheckContext` — ergonomic Check `this`-binding mock
//     - `getCheckEvaluateESM(evaluator)` — ESM-direct (preferred)
//     - `axe` — re-exported lib default; provides `.run`, `.configure`,
//       `.setup`, `.teardown`, `.utils`, `._audit` (populated by `load()`),
//       and the full public API surface for tests that exercise it.
//
//   Compatibility-only (avoid in new tests):
//     - `flatTreeSetup`, `shadowCheckSetup`, `queryShadowFixture`,
//       `shadowSupport` — these mirror legacy patterns for the bulk codemod
//       output. Prefer `getCheckEvaluateESM` + per-test DOM construction in
//       new tests; rely on Vitest's `beforeEach` fixture container for
//       isolation rather than mutating `axe._tree` / `axe._audit` directly.
//
//   Removed (Sprint 5 #16-A):
//     - `getCheckEvaluate(checkId)` — replaced by `getCheckEvaluateESM`. The
//       remaining 74 UMD-hybrid callers are flipped mechanically by #16-B.
//     - `checks` re-export — the ~14 `axe._audit.checks` callers will be
//       fixed by #16-C synthetic-audit; expect them to fail until then.
//
// =============================================================================
// D1 — Canonical evaluator-import pattern
// =============================================================================
//
// Now that the dual-instance issue (UMD bundle + ESM project holding separate
// copies of `lib/core/base/cache.ts`, `lib/standards/*`, `AbstractVirtualNode`)
// has dissolved with the bundle removal, every check evaluator should import
// directly from `lib/checks/<category>/<name>-evaluate.ts` and route through
// `getCheckEvaluateESM`. PRD-01 §4.1 closures (memoize / valid-langs / uuid)
// shipped in commit `031008eb`, removing the last barrier to the pure-ESM path.
//
// =============================================================================

// Side-effect import: must come BEFORE the lib import so `globalThis.axe`
// exists when `lib/core/public/load.ts` writes `axe._audit = …`.
import './init-axe-global';

// ESM default export from the engine. After this import resolves,
// `lib/index.ts` has populated both `axeExport` and `globalThis.axe`, and
// `load(defaultConfig)` has set `globalThis.axe._audit`.
//
// IMPORTANT: We bind `axe` to `globalThis.axe`, NOT to `axeExport`. The two
// are NOT the same object. Vite's `axeGlobalPlugin` injects `var axe = {};`
// per chunk at build time and `lib/index.ts` then `Object.assign`s
// `axeExport`'s function references onto that ambient global. Internal
// engine writes (`axe._audit = ...`, `axe._tree = ...`, `axe._selectorData
// = ...`) target the ambient global, NOT `axeExport`. Tests that read
// internal state through the imported reference would see stale `undefined`
// values if we bound to `axeExport` here. Sprint 5b B1.
import '../../../lib/index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const axe = (globalThis as { axe: any }).axe;

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
 * ESM-direct path. Wraps an evaluator imported straight from
 * `lib/checks/<category>/<name>-evaluate.ts`. Replicates `Check#getOptions`
 * locally: caller-supplied options take precedence over `defaultOptions`,
 * and `defaultOptions` defaults to `{}`.
 *
 * @example
 *   import ariaBusyEvaluate from '../../../lib/checks/aria/aria-busy-evaluate';
 *   const checkEvaluate = getCheckEvaluateESM(ariaBusyEvaluate);
 *   expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
 */
export function getCheckEvaluateESM<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (this: MockCheckContext, ...args: any[]) => any
>(evaluator: T, defaultOptions: Record<string, unknown> = {}) {
  return function evaluateWrapper(
    this: MockCheckContext,
    node: HTMLElement,
    options: unknown,
    virtualNode: unknown,
    context?: unknown
  ): ReturnType<T> {
    // Mirror the runtime `normalizeOptions` (lib/core/base/check.ts §87): an
    // array or scalar gets wrapped as `{ value: <input> }`; a plain object
    // is merged with `defaultOptions`. Spreading an array into a plain
    // object collapses index access — the bug that bit
    // `aria/valid-attr.test.ts` and `aria/valid-attr-value.test.ts` once
    // they were re-flipped to `getCheckEvaluateESM` in #16-B.
    let opts: unknown;
    if (Array.isArray(options)) {
      opts = { value: options };
    } else if (options && typeof options === 'object') {
      opts = { ...defaultOptions, ...(options as Record<string, unknown>) };
    } else if (options !== undefined && options !== null) {
      opts = { value: options };
    } else {
      opts = defaultOptions;
    }
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
  content: string | Node,
  options: unknown = {},
  target?: string
): [HTMLElement, unknown, unknown] {
  // Mirror the legacy testUtils.checkSetup overload pattern: when called as
  // `checkSetup(content, target)` (string second arg, no options), shift.
  if (typeof options === 'string') {
    target = options;
    options = {};
  }
  const fixture = ensureFixture();
  fixture.id = 'fixture'; // some commons code keys off id="fixture"
  if (typeof content === 'string') {
    fixture.innerHTML = content;
  } else {
    fixture.innerHTML = '';
    fixture.appendChild(content);
  }
  // When `content` is a Node, default the target to that node itself —
  // otherwise fall back to the conventional `#target` selector.
  const resolvedTarget =
    target ?? (typeof content === 'string' ? '#target' : null);
  const utils = axe.utils;
  axe.teardown();
  const rootNode = axe.setup(fixture) as { actualNode: HTMLElement };
  const found =
    resolvedTarget !== null
      ? utils.querySelectorAll(rootNode, resolvedTarget)[0]
      : utils.getNodeFromTree(content as Node);
  if (!found) {
    throw new Error(
      `checkSetup: target ${
        resolvedTarget !== null ? `"${resolvedTarget}"` : '<node>'
      } not found in fixture`
    );
  }
  return [found.actualNode, options, found];
}

export function queryFixture(html: string, query = '#target') {
  const fixture = ensureFixture();
  fixture.id = 'fixture';
  fixture.innerHTML = html;
  const utils = axe.utils;
  axe.teardown();
  const rootNode = axe.setup(fixture);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fixtureSetup(content?: string | Node | Node[]): any {
  const fixture = ensureFixture();
  fixture.id = 'fixture';
  if (typeof content === 'string') {
    fixture.innerHTML = content;
  } else if (content instanceof Node) {
    fixture.innerHTML = '';
    fixture.appendChild(content);
  } else if (Array.isArray(content)) {
    fixture.innerHTML = '';
    for (const node of content) {
      fixture.appendChild(node);
    }
  }
  // No-arg form: keep whatever the test already injected into `fixture`
  // (callers sometimes mutate `fixture.innerHTML` and attach a shadow root
  // before calling `fixtureSetup()` to register the composed tree).
  axe.teardown();
  return axe.setup(fixture);
}

/**
 * Build the flattened virtual tree for `content` and stash it on `axe._tree`.
 * Mirrors the legacy `axe.testUtils.flatTreeSetup`. Used by tests that pass
 * a virtual node directly to a check evaluator without going through
 * `checkSetup` / `queryFixture`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flatTreeSetup(content: HTMLElement | string): any[] {
  const tree = axe.utils.getFlattenedTree(content);
  axe._tree = tree;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const utils = axe.utils;
  axe.teardown();
  const vFixture = axe.setup(fixture);
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

export { axe };
