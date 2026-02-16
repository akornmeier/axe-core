import { getTargetRects, getTargetSize } from '../dom';
import { getBoundingRect } from './get-bounding-rect';
import { isPointInRect } from './is-point-in-rect';
import { getRectCenter } from './get-rect-center';
import rectHasMinimumSize from './rect-has-minimum-size';

interface Point {
  x: number;
  y: number;
}

/**
 * Get the offset between target A and neighbor B. This assumes that the target is undersized and needs to check the spacing exception.
 * @method getOffset
 * @memberof axe.commons.math
 * @param {VirtualNode} vTarget
 * @param {VirtualNode} vNeighbor
 * @param {number} minRadiusNeighbour
 * @returns {number | null}
 */
export default function getOffset(
  vTarget: unknown,
  vNeighbor: unknown,
  minRadiusNeighbour: number = 12
): number | null {
  const targetRects: DOMRect[] = getTargetRects(vTarget);
  const neighborRects: DOMRect[] = getTargetRects(vNeighbor);

  if (!targetRects.length || !neighborRects.length) {
    return null;
  }

  const targetBoundingBox = targetRects.reduce(getBoundingRect);
  const targetCenter: Point = getRectCenter(targetBoundingBox);

  // calculate distance to the closest edge of each neighbor rect
  let minDistance = Infinity;
  for (const rect of neighborRects) {
    if (isPointInRect(targetCenter, rect)) {
      return 0;
    }

    const closestPoint = getClosestPoint(targetCenter, rect);
    const distance = pointDistance(targetCenter, closestPoint);
    minDistance = Math.min(minDistance, distance);
  }

  const neighborTargetSize: DOMRect = getTargetSize(vNeighbor, 0);
  if (rectHasMinimumSize(minRadiusNeighbour * 2, neighborTargetSize)) {
    return minDistance;
  }

  const neighborBoundingBox = neighborRects.reduce(getBoundingRect);
  const neighborCenter: Point = getRectCenter(neighborBoundingBox);
  // subtract the radius of the circle from the distance to center to get distance to edge of the neighbor circle
  const centerDistance =
    pointDistance(targetCenter, neighborCenter) - minRadiusNeighbour;

  return Math.max(0, Math.min(minDistance, centerDistance));
}

function getClosestPoint(point: Point, rect: DOMRect): Point {
  let x: number;
  let y: number;

  if (point.x < rect.left) {
    x = rect.left;
  } else if (point.x > rect.right) {
    x = rect.right;
  } else {
    x = point.x;
  }

  if (point.y < rect.top) {
    y = rect.top;
  } else if (point.y > rect.bottom) {
    y = rect.bottom;
  } else {
    y = point.y;
  }

  return { x, y };
}

/**
 * Distance between two points
 * @param {Point} pointA
 * @param {Point} pointB
 * @returns {number}
 */
function pointDistance(pointA: Point, pointB: Point): number {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}
