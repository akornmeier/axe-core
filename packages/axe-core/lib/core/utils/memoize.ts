import { memoize } from '../imports';

// FYI: memoize does not always play nice with esbuild
// and sometimes is built out of order.
// See: https://github.com/evanw/esbuild/issues/1433
//
// To get around this, you may need to import this
// file directly in the file you want to memoize.
//
// For example:
// import memoize from '../../core/utils/memoize';
// vs
// import memoize from '../../core/utils';

declare const axe: { _memoizedFns?: Array<{ clear: () => void }> };

interface MemoizedFunction {
  clear: () => void;
}

// Module-local registry of every memoized function so they can be cleared
// in bulk on `axe.teardown()` without touching the `axe` global at module
// load time. Importing this file under pure ESM (e.g. Vitest browser mode)
// used to throw `ReferenceError: axe is not defined` because the legacy
// `axe._memoizedFns = []` ran during module evaluation.
const memoizedFns = new Set<MemoizedFunction>();

/**
 * Memoize a function.
 * @method memoize
 * @memberof axe.utils
 * @param {Function} fn Function to memoize
 * @return {Function}
 */
function memoizeImplementation<T extends (...args: any[]) => any>(fn: T): T {
  const memoized = memoize(fn);
  memoizedFns.add(memoized);
  // Backward-compat: legacy Karma tests (test/core/utils/memoize.js,
  // test/core/public/teardown.js, test/core/public/run-rules.js) read
  // and mutate `axe._memoizedFns`. Mirror lazily so we never touch the
  // global at module load. The compat alias disappears with Karma in
  // Sprint 5 (PRD-03 plan task #16).
  if (typeof axe !== 'undefined') {
    (axe._memoizedFns ??= []).push(memoized);
  }
  return memoized as T;
}

/**
 * Clear every memoized function registered via `memoize()`. Called by
 * `axe.teardown()` at the end of every run.
 *
 * Also drains `axe._memoizedFns` if Karma test code has substituted or
 * replaced entries on the global array — see `test/core/public/teardown.js`
 * and `test/core/public/run-rules.js` for the patterns.
 */
export function clearAllMemoized(): void {
  memoizedFns.forEach(fn => fn.clear());
  if (typeof axe !== 'undefined' && Array.isArray(axe._memoizedFns)) {
    axe._memoizedFns.forEach(fn => {
      if (!memoizedFns.has(fn)) {
        fn.clear();
      }
    });
  }
}

export default memoizeImplementation;
