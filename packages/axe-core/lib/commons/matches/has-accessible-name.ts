import accessibleTextVirtual from '../text/accessible-text-virtual';
import fromPrimative from './from-primative';
import type { PrimitiveMatcher } from './from-primative';

/**
 * Check if a virtual node has a non-empty accessible name
 *
 * Note: matches.hasAccessibleName(vNode, true) can be indirectly used through
 * matches(vNode, { hasAccessibleName: boolean })
 *
 * Example:
 * ```js
 * matches.hasAccessibleName(vNode, true);
 * matches.hasAccessibleName(vNode, false);
 * ```
 *
 * @param vNode - The virtual node to check
 * @param matcher - The matcher to check against (typically a boolean)
 * @returns true if the accessible name presence matches
 */
function hasAccessibleName(vNode: unknown, matcher: PrimitiveMatcher): boolean {
  return fromPrimative(!!accessibleTextVirtual(vNode), matcher);
}

export default hasAccessibleName;
