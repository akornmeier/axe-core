import { closest } from '../core/utils';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function svgNamespaceMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  try {
    const nodeName = virtualNode.props.nodeName;

    if (nodeName === 'svg') {
      return true;
    }

    // element is svg namespace if its parent is an svg element
    return !!closest(
      virtualNode as unknown as { parent?: unknown } & Record<string, unknown>,
      'svg'
    );
  } catch {
    return false;
  }
}

export default svgNamespaceMatches;
