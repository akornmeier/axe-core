import getComposedParent from './get-composed-parent';
import sanitize from '../text/sanitize';
import { getNodeFromTree } from '../../core/utils';
import getRoleType from '../aria/get-role-type';

interface IsInTextBlockOptions {
  noLengthCompare?: boolean;
}

function walkDomNode(
  node: any,
  functor: (actualNode: Node) => boolean | void
): void {
  if (functor(node.actualNode) !== false) {
    node.children.forEach((child: any) => walkDomNode(child, functor));
  }
}

const blockLike: string[] = [
  'block',
  'list-item',
  'table',
  'flex',
  'grid',
  'inline-block'
];

function isBlock(elm: Element): boolean {
  const display = window.getComputedStyle(elm).getPropertyValue('display');
  return blockLike.includes(display) || display.substr(0, 6) === 'table-';
}

function getBlockParent(node: Element): any {
  // Find the closest parent
  let parentBlock: Node | null = getComposedParent(node);
  while (parentBlock && !isBlock(parentBlock as Element)) {
    parentBlock = getComposedParent(parentBlock);
  }

  return getNodeFromTree(parentBlock as Element);
}

/**
 * Determines if an element is within a text block
 * With `noLengthCompare` true, will return if there is any non-space text outside
 * widgets. When false, compares the length of non-widget text to widget text
 *
 * @param  {Element} node [description]
 * @param  {Object} options Optional
 * @property {Bool} noLengthCompare
 * @return {Boolean}      [description]
 */
function isInTextBlock(node: Element, options?: IsInTextBlockOptions): boolean {
  if (isBlock(node)) {
    // Ignore if the link is a block
    return false;
  }

  // Find all the text part of the parent block not in a link, and all the text in a link
  const virtualParent = getBlockParent(node);
  let parentText = '';
  let widgetText = '';
  let inBrBlock = 0;

  // We want to ignore hidden text, and if br / hr is used, only use the section of the parent
  // that has the link we're looking at
  walkDomNode(virtualParent, (currNode: Node) => {
    // We're already passed it, skip everything else
    if (inBrBlock === 2) {
      return false;
    }

    if (currNode.nodeType === 3) {
      // Add the text to the parent
      parentText += currNode.nodeValue;
    }
    // Ignore any node that's not an element (or text as above)
    if (currNode.nodeType !== 1) {
      return;
    }

    const nodeName = ((currNode as Element).nodeName || '').toUpperCase();
    if (currNode === node) {
      inBrBlock = 1;
    }
    // BR and HR elements break the line
    if (['BR', 'HR'].includes(nodeName)) {
      if (inBrBlock === 0) {
        parentText = '';
        widgetText = '';
      } else {
        inBrBlock = 2;
      }

      // Don't walk nodes with content not displayed on screen.
    } else if (
      (currNode as HTMLElement).style.display === 'none' ||
      (currNode as HTMLElement).style.overflow === 'hidden' ||
      !['', null, 'none'].includes((currNode as HTMLElement).style.float) ||
      !['', null, 'relative'].includes((currNode as HTMLElement).style.position)
    ) {
      return false;

      // Don't walk widgets, we're only interested in what's not in them.
    } else if (getRoleType(currNode as Element) === 'widget') {
      // Grab all the text from this element, but don't walk down it's children
      widgetText += (currNode as Element).textContent;
      return false;
    }
  });

  parentText = sanitize(parentText);
  if (options?.noLengthCompare) {
    return parentText.length !== 0;
  }

  widgetText = sanitize(widgetText);
  return parentText.length > widgetText.length;
}

export default isInTextBlock;
