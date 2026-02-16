import fromFunction from './from-function';
import type { FunctionMatcher } from './from-function';
import { nodeLookup } from '../../core/utils';

/**
 * VirtualNode interface for property matching
 */
interface VNode {
  props: {
    [key: string]: unknown;
  };
}

/**
 * Check if a virtual node matches some attribute(s)
 *
 * Note: matches.properties(vNode, matcher) can be indirectly used through
 * matches(vNode, { properties: matcher })
 *
 * Example:
 * ```js
 * matches.properties(vNode, {
 *   type: 'text', // Simple string match
 *   value: value => value.trim() !== '', // None-empty value, using a function matcher
 * })
 * ```
 *
 * @deprecated HTMLElement is deprecated, use VirtualNode instead
 *
 * @param vNode - The virtual node or HTML element to check
 * @param matcher - Object mapping property names to matchers
 * @returns true if all properties match
 */
function properties(vNode: unknown, matcher: FunctionMatcher): boolean {
  const resolved = nodeLookup(vNode).vNode as VNode;
  return fromFunction((propName: string) => resolved.props[propName], matcher);
}

export default properties;
