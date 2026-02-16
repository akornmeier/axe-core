import fromPrimative from './from-primative';
import type { PrimitiveMatcher } from './from-primative';
import { nodeLookup } from '../../core/utils';

/**
 * VirtualNode interface for node name matching
 */
interface VNode {
  props: {
    nodeName: string;
    [key: string]: unknown;
  };
}

/**
 * Check if the nodeName of a virtual node matches some value.
 *
 * Note: matches.nodeName(vNode, matcher) can be indirectly used through
 * matches(vNode, { nodeName: matcher })
 *
 * Example:
 * ```js
 * matches.nodeName(vNode, ['div', 'span'])
 * ```
 *
 * @deprecated HTMLElement is deprecated, use VirtualNode instead
 *
 * @param vNode - The virtual node or HTML element to check
 * @param matcher - The matcher to check against
 * @returns true if the node name matches
 */
function nodeName(vNode: unknown, matcher: PrimitiveMatcher): boolean {
  const resolved = nodeLookup(vNode).vNode as VNode;
  return fromPrimative(resolved.props.nodeName, matcher);
}

export default nodeName;
