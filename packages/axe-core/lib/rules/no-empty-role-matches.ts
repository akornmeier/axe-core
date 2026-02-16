import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function noEmptyRoleMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  if (!virtualNode.hasAttr('role')) {
    return false;
  }

  if (!virtualNode.attr('role')!.trim()) {
    return false;
  }

  return true;
}

export default noEmptyRoleMatches;
