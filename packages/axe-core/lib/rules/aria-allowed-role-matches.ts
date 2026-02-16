import { getExplicitRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function ariaAllowedRoleMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return (
    getExplicitRole(virtualNode, {
      dpub: true,
      fallback: true
    }) !== null
  );
}

export default ariaAllowedRoleMatches;
