import escapeSelector from './escape-selector';

interface XPathElement {
  str: string;
  id?: string;
  count?: number;
}

function getXPathArray(
  node: Node | null,
  path?: XPathElement[]
): XPathElement[] {
  let sibling: Node | null, count: number | null;
  if (!node) {
    return [];
  }
  if (!path && node.nodeType === 9) {
    path = [{ str: 'html' }];
    return path;
  }
  path = path || [];
  if (node.parentNode && node.parentNode !== node) {
    path = getXPathArray(node.parentNode, path);
  }

  if (node.previousSibling) {
    count = 1;
    sibling = node.previousSibling;
    do {
      if (sibling.nodeType === 1 && sibling.nodeName === node.nodeName) {
        count++;
      }
      sibling = sibling.previousSibling;
    } while (sibling);
    if (count === 1) {
      count = null;
    }
  } else if (node.nextSibling) {
    sibling = node.nextSibling;
    do {
      if (sibling!.nodeType === 1 && sibling!.nodeName === node.nodeName) {
        count = 1;
        sibling = null;
      } else {
        count = null;
        sibling = sibling!.previousSibling;
      }
    } while (sibling);
  }

  if (node.nodeType === 1) {
    const element: XPathElement = { str: '' };
    element.str = node.nodeName.toLowerCase();
    const id =
      (node as Element).getAttribute &&
      escapeSelector((node as Element).getAttribute('id') || '');
    if (id && node.ownerDocument!.querySelectorAll('#' + id).length === 1) {
      element.id = (node as Element).getAttribute('id')!;
    }
    if (count! > 1) {
      element.count = count!;
    }
    path.push(element);
  }
  return path;
}

function xpathToString(xpathArray: XPathElement[]): string {
  return xpathArray.reduce((str, elm) => {
    if (elm.id) {
      return `//${elm.str}[@id='${elm.id}']`;
    } else {
      return str + `/${elm.str}` + (elm.count! > 0 ? `[${elm.count}]` : '');
    }
  }, '');
}

function getXpath(node: Node): string {
  const xpathArray = getXPathArray(node);
  return xpathToString(xpathArray);
}

export default getXpath;
