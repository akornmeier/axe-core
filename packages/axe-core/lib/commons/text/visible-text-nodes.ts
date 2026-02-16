import isVisibleOnScreen from '../dom/is-visible-on-screen';

/**
 * Returns an array of visible text virtual nodes
 *
 * @method visibleTextNodes
 * @memberof axe.commons.text
 * @instance
 * @param {VirtualNode} vNode
 * @return {VitrualNode[]}
 * @deprecated
 */
function visibleTextNodes(vNode: unknown): unknown[] {
  const parentVisible = isVisibleOnScreen(vNode);
  let nodes: unknown[] = [];
  (vNode as any).children.forEach((child: any) => {
    if (child.actualNode.nodeType === 3) {
      if (parentVisible) {
        nodes.push(child);
      }
    } else {
      nodes = nodes.concat(visibleTextNodes(child));
    }
  });
  return nodes;
}

export default visibleTextNodes;
