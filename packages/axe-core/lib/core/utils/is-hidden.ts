import getNodeFromTree from './get-node-from-tree';

/**
 * Determine whether an element is visible
 * @deprecated use isVisibleToScreenreader
 */
function isHidden(el: Node, recursed?: boolean): boolean {
  const node = getNodeFromTree(el) as Record<string, unknown> | null;

  // 9 === Node.DOCUMENT
  if (el.nodeType === 9) {
    return false;
  }

  // 11 === Node.DOCUMENT_FRAGMENT_NODE
  if (el.nodeType === 11) {
    el = (el as ShadowRoot).host;
  }

  if (node && node._isHidden !== null) {
    return node._isHidden as boolean;
  }

  const style = window.getComputedStyle(el as Element, null);

  if (
    !style ||
    !el.parentNode ||
    style.getPropertyValue('display') === 'none' ||
    (!recursed && style.getPropertyValue('visibility') === 'hidden') ||
    (el as Element).getAttribute('aria-hidden') === 'true'
  ) {
    return true;
  }

  const parent = (el as Element).assignedSlot
    ? (el as Element).assignedSlot!
    : el.parentNode;
  const hidden = isHidden(parent as Node, true);

  if (node) {
    node._isHidden = hidden;
  }

  return hidden;
}

export default isHidden;
