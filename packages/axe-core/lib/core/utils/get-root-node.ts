/**
 * Return the document or document fragment (shadow DOM)
 * @method getRootNode
 * @memberof axe.utils
 * @param {Element} node
 * @returns {DocumentFragment|Document}
 */
function getRootNode(node: Node): Document | DocumentFragment {
  let doc = (node.getRootNode && node.getRootNode()) || document;
  if (doc === node) {
    // disconnected node
    doc = document;
  }
  return doc as Document | DocumentFragment;
}

export default getRootNode;
