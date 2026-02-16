import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

/**
 * @deprecated; use :not(html) instead
 */
function notHtmlMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return virtualNode.props.nodeName !== 'html';
}

export default notHtmlMatches;
