import { getComposedParent } from '../commons/dom';

/**
 * Only match the outer-most `aria-hidden=true` element
 * @param {HTMLElement} el the HTMLElement to verify
 * @return {Boolean}
 */
function shouldMatchElement(el: Element | null): boolean {
  if (!el) {
    return true;
  }
  if (el.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  return shouldMatchElement(getComposedParent(el) as Element | null);
}

function ariaHiddenFocusMatches(node: HTMLElement): boolean {
  return shouldMatchElement(getComposedParent(node) as Element | null);
}

export default ariaHiddenFocusMatches;
