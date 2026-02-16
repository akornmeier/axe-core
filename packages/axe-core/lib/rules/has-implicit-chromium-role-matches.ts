import { getImplicitRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function hasImplicitChromiumRoleMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return getImplicitRole(virtualNode, { chromium: true }) !== null;
}

export default hasImplicitChromiumRoleMatches;
