import createGrid from './create-grid';
import { nodeLookup } from '../../core/utils';

/**
 * Get the grid an element exists in
 * @param {Node|VirtualNode} node
 * @returns {Grid}
 */
export default function getNodeGrid(node: unknown): any {
  createGrid(); // Ensure the grid exists
  const { vNode }: { vNode: any } = nodeLookup(node);
  return vNode._grid;
}
