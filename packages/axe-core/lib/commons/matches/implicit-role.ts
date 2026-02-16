import fromPrimative from './from-primative';
import type { PrimitiveMatcher } from './from-primative';
import getImplicitRole from '../aria/implicit-role';

/**
 * Check if a virtual node matches an implicit role(s)
 *
 * Note: matches.implicitRole(vNode, matcher) can be indirectly used through
 * matches(vNode, { implicitRole: matcher })
 *
 * Example:
 * ```js
 * matches.implicitRole(vNode, ['combobox', 'textbox']);
 * matches.implicitRole(vNode, 'combobox');
 * ```
 *
 * @param vNode - The virtual node to check
 * @param matcher - The matcher to check against
 * @returns true if the implicit role matches
 */
function implicitRole(vNode: unknown, matcher: PrimitiveMatcher): boolean {
  return fromPrimative(getImplicitRole(vNode) as string | null, matcher);
}

export default implicitRole;
