import fromFunction from './from-function';
import type { FunctionMatcher } from './from-function';
import { nodeLookup } from '../../core/utils';

/**
 * VirtualNode interface for attribute matching
 */
interface VNode {
  attr(attrName: string): string | null;
}

/**
 * Check if a virtual node matches some attribute(s)
 *
 * Note: matches.attributes(vNode, matcher) can be indirectly used through
 * matches(vNode, { attributes: matcher })
 *
 * Example:
 * ```js
 * matches.attributes(vNode, {
 *   'aria-live': 'assertive', // Simple string match
 *   'aria-expanded': /true|false/i, // either boolean, case insensitive
 * })
 * ```
 *
 * @deprecated HTMLElement is deprecated, use VirtualNode instead
 *
 * @param vNode - The virtual node or HTML element to check
 * @param matcher - Object mapping attribute names to matchers
 * @returns true if all attributes match
 */
function attributes(vNode: unknown, matcher: FunctionMatcher): boolean {
  const resolved = nodeLookup(vNode).vNode as VNode;
  return fromFunction((attrName: string) => resolved.attr(attrName), matcher);
}

export default attributes;
