import fromDefinition from './from-definition';
import type { MatchDefinition } from './from-definition';

/**
 * Check if a virtual node matches a definition
 *
 * Example:
 * ```js
 * // Match a single nodeName:
 * axe.commons.matches(vNode, 'div')
 *
 * // Match one of multiple nodeNames:
 * axe.commons.matches(vNode, ['ul', 'ol'])
 *
 * // Match a node with nodeName 'button' and with aria-hidden: true:
 * axe.commons.matches(vNode, {
 *   nodeName: 'button',
 *   attributes: { 'aria-hidden': 'true' }
 * })
 *
 * // Mixed input. Match button nodeName, input[type=button] and input[type=reset]
 * axe.commons.matches(vNode, ['button', {
 *  nodeName: 'input', // nodeName match isn't case sensitive
 *  properties: { type: ['button', 'reset'] }
 * }])
 * ```
 *
 * @deprecated HTMLElement is deprecated, use VirtualNode instead
 *
 * @param vNode - Virtual node to verify attributes against constraints
 * @param definition - The definition to match against
 * @returns true if vNode passes the constraints expected
 */
function matches(vNode: unknown, definition: MatchDefinition): boolean {
  return fromDefinition(vNode, definition);
}

export default matches;
