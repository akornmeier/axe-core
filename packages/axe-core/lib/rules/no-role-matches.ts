import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function noRoleMatches(node: HTMLElement, vNode: AbstractVirtualNode): boolean {
  return !vNode.attr('role');
}

export default noRoleMatches;
