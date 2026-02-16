import noExplicitNameRequired from './no-explicit-name-required-matches';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

export default (node: HTMLElement, vNode: AbstractVirtualNode): boolean =>
  [noExplicitNameRequired, objectHasLoaded].every(fn => fn(node, vNode));

/**
 * Test if an object loaded content; assume yes if we can't prove otherwise
 *
 * @param {Element} node
 * @param {VirtualNode} vNode
 * @returns {boolean}
 */
function objectHasLoaded(node: HTMLElement): boolean {
  if (!node?.ownerDocument?.createRange) {
    return true; // Assume it did
  }
  // There's no ready
  const range = node.ownerDocument.createRange();
  range.setStart(node, 0);
  range.setEnd(node, node.childNodes.length);
  return range.getClientRects().length === 0;
}
