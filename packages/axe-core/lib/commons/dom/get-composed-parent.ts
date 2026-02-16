/**
 * Get an element's parent in the flattened tree
 * @method getComposedParent
 * @memberof axe.commons.dom
 * @instance
 * @param {Node} element
 * @return {Node|null} Parent element or Null for root node
 */
function getComposedParent(element: Node): Node | null {
  if ((element as Element).assignedSlot) {
    // NOTE: If the display of a slot element isn't 'contents',
    // the slot shouldn't be ignored. Chrome does not support this (yet) so,
    // we'll skip this part for now.
    return getComposedParent((element as Element).assignedSlot!); // parent of a shadow DOM slot
  } else if (element.parentNode) {
    const parentNode = element.parentNode;
    if (parentNode.nodeType === 1) {
      return parentNode; // Regular node
    } else if ((parentNode as ShadowRoot).host) {
      return (parentNode as ShadowRoot).host; // Shadow root
    }
  }
  return null; // Root node
}

export default getComposedParent;
