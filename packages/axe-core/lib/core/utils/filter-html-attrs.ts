import cache from '../base/cache';
import getNodeAttributes from './get-node-attributes';
import matchesSelector from './element-matches';

/**
 * Filter attributes from an html element and all of its children.
 */
export default function filterHtmlAttrs(
  element: Node,
  filterAttrs: Record<string, unknown>
): Node {
  if (!filterAttrs) {
    return element;
  }

  let node: Node = element.cloneNode(false);
  const attributes = getNodeAttributes(node as Element);

  if (node.nodeType === 1) {
    const outerHTML = (node as Element).outerHTML;
    node = cache.get(outerHTML, () =>
      setNodeAttributes(
        node as Element,
        attributes!,
        element as Element,
        filterAttrs
      )
    ) as Node;
  } else {
    node = setNodeAttributes(
      node as Element,
      attributes!,
      element as Element,
      filterAttrs
    );
  }

  // be sure to append text nodes as well
  Array.from(element.childNodes).forEach(child => {
    node.appendChild(filterHtmlAttrs(child, filterAttrs));
  });

  return node;
}

function setNodeAttributes(
  node: Element,
  attributes: NamedNodeMap | null,
  element: Element,
  filterAttrs: Record<string, unknown>
): Element {
  if (!attributes) {
    return node;
  }
  node = document.createElement(node.nodeName);
  Array.from(attributes).forEach(attr => {
    if (!attributeMatches(element, attr.name, filterAttrs)) {
      node.setAttribute(attr.name, attr.value);
    }
  });
  return node;
}

/**
 * Test if node and attribute match one of the filtered attributes.
 */
function attributeMatches(
  node: Element,
  attrName: string,
  filterAttrs: Record<string, unknown>
): boolean {
  if (typeof filterAttrs[attrName] === 'undefined') {
    return false;
  }

  // filterAttrs can only be a boolean or a CSS selector
  if (filterAttrs[attrName] === true) {
    return true;
  }

  return matchesSelector(node, filterAttrs[attrName] as string);
}
