interface ScrollStateEntry {
  elm: Element | Window;
  top: number;
  left: number;
}

/**
 * set the scroll position of an element
 */
function setScroll(elm: Element | Window, top: number, left: number): void {
  if (elm === window) {
    return (elm as Window).scroll(left, top);
  } else {
    (elm as Element).scrollTop = top;
    (elm as Element).scrollLeft = left;
  }
}

/**
 * set the scroll position of all items in the scrollState array
 * @deprecated
 */
export function setScrollState(scrollState: ScrollStateEntry[]): void {
  scrollState.forEach(({ elm, top, left }) => setScroll(elm, top, left));
}

export default setScrollState;
