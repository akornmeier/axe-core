import fromPrimative from './from-primative';
import type { PrimitiveMatcher } from './from-primative';
import getExplicitRole from '../aria/get-explicit-role';

/**
 * Check if a virtual node matches an explicit role(s)
 *
 * Note: matches.explicitRole(vNode, matcher) can be indirectly used through
 * matches(vNode, { explicitRole: matcher })
 *
 * Example:
 * ```js
 * matches.explicitRole(vNode, ['combobox', 'textbox']);
 * matches.explicitRole(vNode, 'combobox');
 * ```
 *
 * @param vNode - The virtual node to check
 * @param matcher - The matcher to check against
 * @returns true if the explicit role matches
 */
function explicitRole(vNode: unknown, matcher: PrimitiveMatcher): boolean {
  return fromPrimative(getExplicitRole(vNode) as string | null, matcher);
}

export default explicitRole;
