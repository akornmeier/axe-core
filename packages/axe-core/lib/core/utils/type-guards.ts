/**
 * DOM type narrowing helpers for TypeScript migration.
 * Use these instead of raw `instanceof` checks for better type safety.
 *
 * The codebase currently uses numeric `nodeType` comparisons extensively
 * (e.g., `node.nodeType === 1`). These guards provide named, type-safe
 * alternatives that also narrow TypeScript types via `is` predicates.
 */

// ---------------------------------------------------------------------------
// instanceof-based guards (work on `unknown` values)
// ---------------------------------------------------------------------------

export function isHTMLElement(node: unknown): node is HTMLElement {
  return node instanceof HTMLElement;
}

export function isInputElement(node: unknown): node is HTMLInputElement {
  return node instanceof HTMLInputElement;
}

export function isSelectElement(node: unknown): node is HTMLSelectElement {
  return node instanceof HTMLSelectElement;
}

export function isTextAreaElement(node: unknown): node is HTMLTextAreaElement {
  return node instanceof HTMLTextAreaElement;
}

export function isButtonElement(node: unknown): node is HTMLButtonElement {
  return node instanceof HTMLButtonElement;
}

export function isAnchorElement(node: unknown): node is HTMLAnchorElement {
  return node instanceof HTMLAnchorElement;
}

export function isImageElement(node: unknown): node is HTMLImageElement {
  return node instanceof HTMLImageElement;
}

export function isLabelElement(node: unknown): node is HTMLLabelElement {
  return node instanceof HTMLLabelElement;
}

export function isFormElement(node: unknown): node is HTMLFormElement {
  return node instanceof HTMLFormElement;
}

export function isTableElement(node: unknown): node is HTMLTableElement {
  return node instanceof HTMLTableElement;
}

export function isMediaElement(node: unknown): node is HTMLMediaElement {
  return node instanceof HTMLMediaElement;
}

export function isSVGElement(node: unknown): node is SVGElement {
  return node instanceof SVGElement;
}

export function isDocument(node: unknown): node is Document {
  return node instanceof Document;
}

export function isWindow(obj: unknown): obj is Window {
  return obj instanceof Window;
}

export function isNode(obj: unknown): obj is Node {
  return obj instanceof Node;
}

export function isElement(node: unknown): node is Element {
  return node instanceof Element;
}

export function isDocumentFragment(node: unknown): node is DocumentFragment {
  return node instanceof DocumentFragment;
}

export function isShadowRoot(node: unknown): node is ShadowRoot {
  return node instanceof ShadowRoot;
}

// ---------------------------------------------------------------------------
// nodeType-based guards (require a known Node; replace magic numbers)
// ---------------------------------------------------------------------------

/** nodeType === 1 — Element */
export function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

/** nodeType === 3 — Text */
export function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

/** nodeType === 9 — Document */
export function isDocumentNode(node: Node): node is Document {
  return node.nodeType === Node.DOCUMENT_NODE;
}

/** nodeType === 11 — DocumentFragment (includes ShadowRoot) */
export function isDocumentFragmentNode(node: Node): node is DocumentFragment {
  return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
