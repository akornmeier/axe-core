import cache from '../base/cache';
import { resetGlobals } from './run/globals-setup';
import { clearAllMemoized } from '../utils/memoize';

declare const axe: {
  _tree: unknown[] | undefined;
  _selectorData: unknown;
  _selectCache: unknown;
};

/**
 * Clean up axe-core tree and caches. `axe.run` will call this function at the end of the run so there's no need to call it yourself afterwards.
 */
function teardown(): void {
  // Reset MUST to happen before the cache is cleared
  resetGlobals();
  clearAllMemoized();
  cache.clear();
  axe._tree = undefined;
  axe._selectorData = undefined;
  axe._selectCache = undefined;
}

export default teardown;
