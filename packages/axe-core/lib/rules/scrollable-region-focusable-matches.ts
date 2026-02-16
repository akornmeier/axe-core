import hasContentVirtual, {
  hasChildTextNodes
} from '../commons/dom/has-content-virtual';
import isComboboxPopup from '../commons/aria/is-combobox-popup';
import { querySelectorAll, getScroll } from '../core/utils';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

export default function scrollableRegionFocusableMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return (
    // The element scrolls
    getScroll(node, 13) !== undefined &&
    // It's not a combobox popup, which commonly has keyboard focus added
    isComboboxPopup(virtualNode) === false &&
    // And there's something actually worth scrolling to
    isNonEmptyElementOutsideViewableRect(virtualNode)
  );
}

function isNonEmptyElementOutsideViewableRect(
  vNode: AbstractVirtualNode
): boolean {
  const boundingRect = (vNode as any).boundingClientRect;

  return querySelectorAll(vNode, '*').some((elm: unknown) => {
    const vElm = elm as AbstractVirtualNode;
    // (elm, noRecursion, ignoreAria)
    if (!hasContentVirtual(vElm, true, true)) {
      return false;
    }

    let rects: DOMRect[] = [];
    if (hasChildTextNodes(vElm)) {
      rects.push(...getContentRects(vElm));
    } else {
      rects = [(vElm as any).boundingClientRect];
    }

    return rects.some(rect => {
      return (
        rect.left < boundingRect.left ||
        rect.right > boundingRect.right ||
        rect.top < boundingRect.top ||
        rect.bottom > boundingRect.bottom
      );
    });
  });
}

function getContentRects(vNode: AbstractVirtualNode): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents((vNode as any).actualNode);
  return Array.from(range.getClientRects());
}
