import { findNearbyElms, isFocusable, isInTabOrder } from '../../commons/dom';
import { getRoleType } from '../../commons/aria';
import {
  splitRects,
  rectHasMinimumSize,
  hasVisualOverlap
} from '../../commons/math';
import { contains } from '../../core/utils';

/**
 * Determine if an element has a minimum size, taking into account
 * any elements that may obscure it.
 */
export default function targetSizeEvaluate(
  this: any,
  node: HTMLElement,
  options: any,
  vNode: any
): boolean | undefined {
  const minSize = options?.minSize || 24;
  const nodeRect = vNode.boundingClientRect;
  if (rectHasMinimumSize(minSize * 10, nodeRect)) {
    this.data({ messageKey: 'large', minSize });
    return true;
  }

  const hasMinimumSize = rectHasMinimumSize.bind(null, minSize);
  const nearbyElms = findNearbyElms(vNode);
  const overflowingContent = filterOverflowingContent(vNode, nearbyElms);
  const { fullyObscuringElms, partialObscuringElms } = filterByElmsOverlap(
    vNode,
    nearbyElms
  );

  if (
    overflowingContent.length &&
    (fullyObscuringElms.length || !hasMinimumSize(nodeRect))
  ) {
    this.data({ minSize, messageKey: 'contentOverflow' });
    this.relatedNodes(mapActualNodes(overflowingContent));
    return undefined;
  }

  if (fullyObscuringElms.length) {
    this.relatedNodes(mapActualNodes(fullyObscuringElms));
    this.data({ messageKey: 'obscured' });
    return true;
  }

  const negativeOutcome = isInTabOrder(vNode) ? false : undefined;

  if (!hasMinimumSize(nodeRect)) {
    this.data({ minSize, ...toDecimalSize(nodeRect) });
    return negativeOutcome;
  }

  const obscuredWidgets = filterFocusableWidgets(partialObscuringElms);

  if (!obscuredWidgets.length) {
    this.data({ minSize, ...toDecimalSize(nodeRect) });
    return true;
  }

  const largestInnerRect = getLargestUnobscuredArea(vNode, obscuredWidgets);
  if (!largestInnerRect) {
    this.data({ minSize, messageKey: 'tooManyRects' });
    return undefined;
  }

  if (!hasMinimumSize(largestInnerRect)) {
    if (overflowingContent.length) {
      this.data({ minSize, messageKey: 'contentOverflow' });
      this.relatedNodes(mapActualNodes(overflowingContent));
      return undefined;
    }

    const allTabbable = obscuredWidgets.every(isInTabOrder);
    const messageKey = `partiallyObscured${allTabbable ? '' : 'NonTabbable'}`;

    this.data({ messageKey, minSize, ...toDecimalSize(largestInnerRect) });
    this.relatedNodes(mapActualNodes(obscuredWidgets));
    return allTabbable ? negativeOutcome : undefined;
  }

  this.data({ minSize, ...toDecimalSize(largestInnerRect || nodeRect) });
  this.relatedNodes(mapActualNodes(obscuredWidgets));
  return true;
}

function filterOverflowingContent(vNode: any, nearbyElms: any[]): any[] {
  return nearbyElms.filter(
    (nearbyElm: any) =>
      !isEnclosedRect(nearbyElm, vNode) &&
      isDescendantNotInTabOrder(vNode, nearbyElm)
  );
}

function filterByElmsOverlap(
  vNode: any,
  nearbyElms: any[]
): { fullyObscuringElms: any[]; partialObscuringElms: any[] } {
  const fullyObscuringElms: any[] = [];
  const partialObscuringElms: any[] = [];
  for (const vNeighbor of nearbyElms) {
    if (
      !isDescendantNotInTabOrder(vNode, vNeighbor) &&
      hasVisualOverlap(vNode, vNeighbor) &&
      getCssPointerEvents(vNeighbor) !== 'none'
    ) {
      if (isEnclosedRect(vNode, vNeighbor)) {
        fullyObscuringElms.push(vNeighbor);
      } else {
        partialObscuringElms.push(vNeighbor);
      }
    }
  }
  return { fullyObscuringElms, partialObscuringElms };
}

function getLargestUnobscuredArea(vNode: any, obscuredNodes: any[]): any {
  const nodeRect = vNode.boundingClientRect;
  const obscuringRects = obscuredNodes.map(
    ({ boundingClientRect: rect }: any) => rect
  );
  let unobscuredRects: any[];
  try {
    unobscuredRects = splitRects(nodeRect, obscuringRects);
  } catch {
    return null;
  }

  return getLargestRect(unobscuredRects);
}

function getLargestRect(rects: any[], minSize?: number): any {
  return rects.reduce((rectA: any, rectB: any) => {
    const rectAisMinimum = rectHasMinimumSize(minSize ?? 0, rectA);
    const rectBisMinimum = rectHasMinimumSize(minSize ?? 0, rectB);
    if (rectAisMinimum !== rectBisMinimum) {
      return rectAisMinimum ? rectA : rectB;
    }
    const areaA = rectA.width * rectA.height;
    const areaB = rectB.width * rectB.height;
    return areaA > areaB ? rectA : rectB;
  });
}

function filterFocusableWidgets(vNodes: any[]): any[] {
  return vNodes.filter(
    (vNode: any) => getRoleType(vNode) === 'widget' && isFocusable(vNode)
  );
}

function isEnclosedRect(vNodeA: any, vNodeB: any): boolean {
  const rectA = vNodeA.boundingClientRect;
  const rectB = vNodeB.boundingClientRect;
  return (
    rectA.top >= rectB.top &&
    rectA.left >= rectB.left &&
    rectA.bottom <= rectB.bottom &&
    rectA.right <= rectB.right
  );
}

function getCssPointerEvents(vNode: any): string {
  return vNode.getComputedStylePropertyValue('pointer-events');
}

function toDecimalSize(rect: any): { width: number; height: number } {
  return {
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10
  };
}

function isDescendantNotInTabOrder(vAncestor: any, vNode: any): boolean {
  return contains(vAncestor, vNode) && !isInTabOrder(vNode);
}

function mapActualNodes(vNodes: any[]): any[] {
  return vNodes.map(({ actualNode }: any) => actualNode);
}
