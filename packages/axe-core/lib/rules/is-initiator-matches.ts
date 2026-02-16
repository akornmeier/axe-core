import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function isInitiatorMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode,
  context: { initiator: boolean; [key: string]: unknown }
): boolean {
  return context.initiator;
}

export default isInitiatorMatches;
