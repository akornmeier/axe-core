interface ScrollOffset {
  left: number;
  top: number;
}

/**
 * Get the scroll offset of the document passed in
 * @method getScrollOffset
 * @memberof axe.commons.dom
 * @instance
 * @param {Document} element The element to evaluate, defaults to document
 * @return {Object} Contains the attributes `x` and `y` which contain the scroll offsets
 */
function getScrollOffset(element: Document | Window | Element): ScrollOffset {
  if (!(element as Node).nodeType && (element as Window).document) {
    element = (element as Window).document;
  }

  // 9 === Node.DOCUMENT_NODE
  if ((element as Node).nodeType === 9) {
    const docElement = (element as Document).documentElement,
      body = (element as Document).body;

    return {
      left:
        (docElement && docElement.scrollLeft) || (body && body.scrollLeft) || 0,
      top: (docElement && docElement.scrollTop) || (body && body.scrollTop) || 0
    };
  }

  return {
    left: (element as Element).scrollLeft,
    top: (element as Element).scrollTop
  };
}

export default getScrollOffset;
