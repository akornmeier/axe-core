import cache from '../base/cache';

/**
 * Return a single node from the virtual dom tree
 *
 * @param {Object} vNode The flattened, virtual DOM tree
 * @param {Node}   node  The HTML DOM node
 */
function getNodeFromTree(vNode: unknown, node?: Node): unknown {
  const el = node || vNode;
  const nodeMap = cache.get('nodeMap') as Map<unknown, unknown> | undefined;
  return nodeMap ? nodeMap.get(el) : null;
}

export default getNodeFromTree;
