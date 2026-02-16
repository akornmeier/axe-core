/**
 * Gets a unique CSS selector
 * @param {HTMLElement} node The element to get the selector for
 * @param {Object} optional options
 * @returns {String|Array<String>} Unique CSS selector for the node
 */
export default function getShadowSelector(
  generateSelector: (
    elm: Element,
    options: Record<string, unknown>,
    doc: Document | DocumentFragment
  ) => string,
  elm: Element,
  options: Record<string, unknown> = {}
): string | string[] {
  if (!elm) {
    return '';
  }
  let doc =
    ((elm as unknown as { getRootNode?: () => Node }).getRootNode &&
      (elm as unknown as { getRootNode: () => Node }).getRootNode()) ||
    document;
  // Not a DOCUMENT_FRAGMENT - shadow DOM
  if (doc.nodeType !== 11) {
    return generateSelector(elm, options, doc as Document);
  }

  const stack: Array<{ elm: Element; doc: Node }> = [];
  while (doc.nodeType === 11) {
    if (!(doc as ShadowRoot).host) {
      return '';
    }
    stack.unshift({ elm, doc });
    elm = (doc as ShadowRoot).host;
    doc = (elm as unknown as { getRootNode: () => Node }).getRootNode();
  }

  stack.unshift({ elm, doc });
  return stack.map(item =>
    generateSelector(item.elm, options, item.doc as Document | DocumentFragment)
  );
}
