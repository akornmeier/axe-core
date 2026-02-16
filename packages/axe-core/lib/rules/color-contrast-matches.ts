/* global document */
import { getAccessibleRefs } from '../commons/aria';
import {
  findUpVirtual,
  visuallyOverlaps,
  getRootNode,
  isInert,
  getOverflowHiddenAncestors
} from '../commons/dom';
import {
  visibleVirtual,
  removeUnicode,
  sanitize,
  isIconLigature
} from '../commons/text';
import { rectsOverlap } from '../commons/math';
import { isDisabled } from '../commons/forms';
import { getNodeFromTree, querySelectorAll, tokenList } from '../core/utils';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function colorContrastMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const { nodeName, type: inputType } = virtualNode.props;

  // Don't test options, color contrast doesn't work well on these
  if (nodeName === 'option') {
    return false;
  }
  // Don't test empty select elements
  if (nodeName === 'select' && !(node as HTMLSelectElement).options.length) {
    return false;
  }

  // some input types don't have text, so the rule shouldn't be applied
  const nonTextInput = [
    'hidden',
    'range',
    'color',
    'checkbox',
    'radio',
    'image'
  ];
  if (nodeName === 'input' && nonTextInput.includes(inputType as string)) {
    return false;
  }

  if (isDisabled(virtualNode) || isInert(virtualNode)) {
    return false;
  }

  // form elements that don't have direct child text nodes need to check that
  // the text indent has not been changed and moved the text away from the
  // control
  const formElements = ['input', 'select', 'textarea'];
  if (formElements.includes(nodeName)) {
    const style = window.getComputedStyle(node);
    const textIndent = parseInt(style.getPropertyValue('text-indent'), 10);

    if (textIndent) {
      // since we can't get the actual bounding rect of the text node, we'll
      // use the current nodes bounding rect and adjust by the text-indent to
      // see if it still overlaps the node
      let rect = node.getBoundingClientRect();
      rect = {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left + textIndent,
        right: rect.right + textIndent
      } as DOMRect;

      if (!visuallyOverlaps(rect, node)) {
        return false;
      }
    }
    // Match all form fields, regardless of if they have text
    return true;
  }
  const nodeParentLabel = findUpVirtual(virtualNode, 'label');
  if (nodeName === 'label' || nodeParentLabel) {
    const labelNode = (nodeParentLabel || node) as HTMLLabelElement;
    const labelVirtual = nodeParentLabel
      ? getNodeFromTree(nodeParentLabel)
      : virtualNode;

    // explicit label of disabled control
    if (labelNode.htmlFor) {
      const doc = getRootNode(labelNode);
      const explicitControl = (doc as Document).getElementById(
        labelNode.htmlFor
      );
      const explicitControlVirtual =
        explicitControl && getNodeFromTree(explicitControl);

      if (
        explicitControlVirtual &&
        isDisabled(explicitControlVirtual as AbstractVirtualNode)
      ) {
        return false;
      }
    }

    // implicit label of disabled control
    const query =
      'input:not(' +
      '[type="hidden"],' +
      '[type="image"],' +
      '[type="button"],' +
      '[type="submit"],' +
      '[type="reset"]' +
      '), select, textarea';
    const implicitControl = querySelectorAll(labelVirtual, query)[0];

    if (implicitControl && isDisabled(implicitControl as AbstractVirtualNode)) {
      return false;
    }
  }

  const ariaLabelledbyControls: AbstractVirtualNode[] = [];
  let ancestorNode: AbstractVirtualNode | undefined = virtualNode;
  while (ancestorNode) {
    // Find any ancestor (including itself) that is used with aria-labelledby
    if (ancestorNode.props.id) {
      const virtualControls = getAccessibleRefs(ancestorNode)
        .filter(control => {
          return tokenList(
            control.getAttribute('aria-labelledby') || ''
          ).includes(ancestorNode!.props.id as string);
        })
        .map(control => getNodeFromTree(control) as AbstractVirtualNode);

      ariaLabelledbyControls.push(...virtualControls);
    }
    ancestorNode = ancestorNode.parent;
  }

  if (
    ariaLabelledbyControls.length > 0 &&
    ariaLabelledbyControls.every(isDisabled)
  ) {
    return false;
  }

  if (!hasRealTextChildren(virtualNode)) {
    return false;
  }

  if (
    !parseFloat((virtualNode as any).getComputedStylePropertyValue('font-size'))
  ) {
    return false;
  }

  const range = document.createRange();
  const childNodes = (virtualNode as any).children;
  for (let index = 0; index < childNodes.length; index++) {
    const child = childNodes[index];
    if (
      child.actualNode.nodeType === 3 &&
      sanitize(child.actualNode.nodeValue) !== ''
    ) {
      range.selectNodeContents(child.actualNode);
    }
  }

  const rects = Array.from(range.getClientRects());
  const clippingAncestors = getOverflowHiddenAncestors(virtualNode);
  return rects.some(rect => {
    //check to see if the rectangle impinges
    const overlaps = visuallyOverlaps(rect, node);

    if (!clippingAncestors.length) {
      return overlaps;
    }

    const withinOverflow = clippingAncestors.some(overflowNode => {
      return rectsOverlap(rect, (overflowNode as any).boundingClientRect);
    });

    return overlaps && withinOverflow;
  });
}

export default colorContrastMatches;

const removeUnicodeOptions = {
  emoji: true,
  nonBmp: false,
  punctuations: true
};

function hasRealTextChildren(virtualNode: AbstractVirtualNode): boolean {
  const visibleText = visibleVirtual(virtualNode, false, true);
  if (
    visibleText === '' ||
    removeUnicode(visibleText, removeUnicodeOptions) === ''
  ) {
    return false;
  }
  return (virtualNode as any).children.some(
    (vChild: any) =>
      vChild.props.nodeName === '#text' && !isIconLigature(vChild)
  );
}
