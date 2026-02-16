import fromPrimative from './from-primative';
import type { PrimitiveMatcher } from './from-primative';
import getRole from '../aria/get-role';

/**
 * Check if a virtual node matches a semantic role(s)
 *
 * Note: matches.semanticRole(vNode, matcher) can be indirectly used through
 * matches(vNode, { semanticRole: matcher })
 *
 * Example:
 * ```js
 * matches.semanticRole(vNode, ['combobox', 'textbox']);
 * matches.semanticRole(vNode, 'combobox');
 * ```
 *
 * @param vNode - The virtual node to check
 * @param matcher - The matcher to check against
 * @returns true if the semantic role matches
 */
function semanticRole(vNode: unknown, matcher: PrimitiveMatcher): boolean {
  return fromPrimative(getRole(vNode) as string | null, matcher);
}

export default semanticRole;
