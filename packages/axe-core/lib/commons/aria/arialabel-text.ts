import { nodeLookup } from '../../core/utils';

/**
 * Get the text value of aria-label, if any
 *
 * @deprecated Do not use Element directly. Pass VirtualNode instead
 * @param {VirtualNode|Element} element
 * @return {string} ARIA label
 */
export default function arialabelText(element: any): string {
  const { vNode }: { vNode: any } = nodeLookup(element);
  if (vNode?.props.nodeType !== 1) {
    return '';
  }

  return vNode.attr('aria-label') || '';
}
