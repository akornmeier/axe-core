import { findNearbyElms, isFocusable, isInTabOrder } from '../../commons/dom';
import { getRoleType } from '../../commons/aria';
import { getOffset, rectHasMinimumSize } from '../../commons/math';

const roundingMargin = 0.05;

export default function targetOffsetEvaluate(
  this: any,
  node: HTMLElement,
  options: any,
  vNode: any
): boolean | undefined {
  const minOffset = options?.minOffset || 24;
  // Bail early to avoid hitting very expensive calculations.
  if (rectHasMinimumSize(minOffset * 10, vNode.boundingClientRect)) {
    this.data({ messageKey: 'large', minOffset });
    return true;
  }

  const closeNeighbors: any[] = [];
  let closestOffset = minOffset;
  for (const vNeighbor of findNearbyElms(vNode, minOffset)) {
    if (getRoleType(vNeighbor) !== 'widget' || !isFocusable(vNeighbor)) {
      continue;
    }
    let offset: number | null = null;
    try {
      offset = getOffset(vNode, vNeighbor, minOffset / 2);
    } catch (err: any) {
      if (err.message.startsWith('splitRects')) {
        this.data({
          messageKey: 'tooManyRects',
          closestOffset: 0,
          minOffset
        });
        return undefined;
      }

      throw err;
    }

    if (offset === null) {
      continue;
    }

    offset = roundToSingleDecimal(offset) * 2;
    if (offset + roundingMargin >= minOffset) {
      continue;
    }
    closestOffset = Math.min(closestOffset, offset);
    closeNeighbors.push(vNeighbor);
  }

  if (closeNeighbors.length === 0) {
    this.data({ closestOffset, minOffset });
    return true;
  }

  this.relatedNodes(closeNeighbors.map(({ actualNode }: any) => actualNode));

  if (!closeNeighbors.some(isInTabOrder)) {
    this.data({
      messageKey: 'nonTabbableNeighbor',
      closestOffset,
      minOffset
    });
    return undefined;
  }

  this.data({ closestOffset, minOffset });
  return isInTabOrder(vNode) ? false : undefined;
}

function roundToSingleDecimal(num: number): number {
  return Math.round(num * 10) / 10;
}
