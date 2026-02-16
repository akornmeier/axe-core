import memoize from './memoize';

interface ScrollInfo {
  elm: Element;
  top: number;
  left: number;
}

/**
 * Get the scroll position of given element
 */
function getScroll(elm: Element, buffer = 0): ScrollInfo | undefined {
  const overflowX = elm.scrollWidth > elm.clientWidth + buffer;
  const overflowY = elm.scrollHeight > elm.clientHeight + buffer;

  if (!(overflowX || overflowY)) {
    return;
  }

  const style = window.getComputedStyle(elm);
  const scrollableX = isScrollable(style, 'overflow-x');
  const scrollableY = isScrollable(style, 'overflow-y');

  if ((overflowX && scrollableX) || (overflowY && scrollableY)) {
    return {
      elm,
      top: elm.scrollTop,
      left: elm.scrollLeft
    };
  }
}

function isScrollable(style: CSSStyleDeclaration, prop: string): boolean {
  const overflowProp = style.getPropertyValue(prop);
  return ['scroll', 'auto'].includes(overflowProp);
}

export default memoize(getScroll);
