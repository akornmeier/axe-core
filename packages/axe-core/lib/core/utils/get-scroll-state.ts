import getScroll from './get-scroll';

interface ScrollState {
  elm: Window | Element;
  top: number;
  left: number;
}

/**
 * Create an array scroll positions from descending elements
 */
function getElmScrollRecursive(root: Element): ScrollState[] {
  return Array.from(root.children || root.childNodes || []).reduce(
    (scrolls: ScrollState[], elm) => {
      const scroll = getScroll(elm as Element) as ScrollState | undefined;
      if (scroll) {
        scrolls.push(scroll);
      }
      return scrolls.concat(getElmScrollRecursive(elm as Element));
    },
    []
  );
}

/**
 * Get the scroll position of all scrollable elements in a page
 * @deprecated
 */
function getScrollState(win: Window = window): ScrollState[] {
  const root = win.document.documentElement;
  const windowScroll: ScrollState[] = [
    win.pageXOffset !== undefined
      ? {
          elm: win,
          top: win.pageYOffset,
          left: win.pageXOffset
        }
      : {
          elm: root,
          top: root.scrollTop,
          left: root.scrollLeft
        }
  ];

  return windowScroll.concat(getElmScrollRecursive(document.body));
}

export default getScrollState;
