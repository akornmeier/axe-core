import svgNamespaceMatches from './svg-namespace-matches';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function htmlNamespaceMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return !svgNamespaceMatches(node, virtualNode);
}

export default htmlNamespaceMatches;
