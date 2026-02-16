import matches from './matches';

/**
 * closest implementation that operates on a VirtualNode
 *
 * @method closest
 * @memberof axe.utils
 * @param {VirtualNode} vNode VirtualNode to match
 * @param {String} selector CSS selector string
 * @return {VirtualNode | null}
 */
function closest(
  vNode: { parent?: unknown } & Record<string, unknown>,
  selector: string
): Record<string, unknown> | null {
  while (vNode) {
    if (matches(vNode, selector)) {
      return vNode;
    }

    // the top node of the tree will have parent === null, so a
    // undefined parent means we are in a disconnected tree
    if (typeof vNode.parent === 'undefined') {
      throw new TypeError('Cannot resolve parent for non-DOM nodes');
    }

    vNode = vNode.parent as typeof vNode;
  }

  return null;
}

export default closest;
