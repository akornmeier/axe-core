import getComposedParent from './get-composed-parent';
import getElementCoordinates from './get-element-coordinates';
import getViewportSize from './get-viewport-size';
import { nodeLookup } from '../../core/utils';

interface IsOffscreenOptions {
  isAncestor?: boolean | undefined;
}

function noParentScrolled(element: Element, offset: number): boolean {
  let current: Element | null = getComposedParent(element) as Element | null;
  while (current && current.nodeName.toLowerCase() !== 'html') {
    if (current.scrollTop) {
      offset += current.scrollTop;
      if (offset >= 0) {
        return false;
      }
    }
    current = getComposedParent(current) as Element | null;
  }
  return true;
}

/**
 * Determines if element is off screen
 * @method isOffscreen
 * @memberof axe.commons.dom
 * @instance
 * @param  {Element} element
 * @param {Object} [options]
 * @param {Boolean} [options.isAncestor] If this function is being called on an ancestor of the target node
 * @return {Boolean|undefined}
 */
function isOffscreen(
  element: unknown,
  { isAncestor }: IsOffscreenOptions = {}
): boolean | undefined {
  if (isAncestor) {
    return false;
  }

  const { domNode } = nodeLookup(element);
  if (!domNode) {
    return undefined;
  }

  let leftBoundary: number;
  const docElement = document.documentElement;
  const styl = window.getComputedStyle(domNode as Element);
  const dir = window
    .getComputedStyle(document.body || docElement)
    .getPropertyValue('direction');
  const coords = getElementCoordinates(domNode as Element);

  // bottom edge beyond
  if (
    coords.bottom < 0 &&
    (noParentScrolled(domNode as Element, coords.bottom) ||
      styl.position === 'absolute')
  ) {
    return true;
  }

  if (coords.left === 0 && coords.right === 0) {
    //This is an edge case, an empty (zero-width) element that isn't positioned 'off screen'.
    return false;
  }

  if (dir === 'ltr') {
    if (coords.right <= 0) {
      return true;
    }
  } else {
    leftBoundary = Math.max(
      docElement.scrollWidth,
      getViewportSize(window).width
    );
    if (coords.left >= leftBoundary) {
      return true;
    }
  }

  return false;
}

export default isOffscreen;
