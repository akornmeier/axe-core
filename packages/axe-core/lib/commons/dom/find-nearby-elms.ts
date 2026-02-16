import getNodeGrid from './get-node-grid';
import { memoize } from '../../core/utils';

export default function findNearbyElms(vNode: any, margin: number = 0): any[] {
  const grid = getNodeGrid(vNode);
  if (!grid?.cells?.length) {
    return []; // Elements not in the grid don't have ._grid
  }
  const rect = vNode.boundingClientRect;
  const selfIsFixed = hasFixedPosition(vNode);
  const gridPosition = grid.getGridPositionOfRect(rect, margin);

  const neighbors: any[] = [];
  grid.loopGridPosition(gridPosition, (vNeighbors: any[]) => {
    for (const vNeighbor of vNeighbors) {
      if (
        vNeighbor &&
        vNeighbor !== vNode &&
        !neighbors.includes(vNeighbor) &&
        selfIsFixed === hasFixedPosition(vNeighbor)
      ) {
        neighbors.push(vNeighbor);
      }
    }
  });

  return neighbors;
}

const hasFixedPosition: (vNode: any) => boolean = memoize(
  (vNode: any): boolean => {
    if (!vNode) {
      return false;
    }
    if (vNode.getComputedStylePropertyValue('position') === 'fixed') {
      return true;
    }
    return hasFixedPosition(vNode.parent);
  }
);
