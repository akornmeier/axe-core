import { getRole } from '../commons/aria';
import standards from '../standards';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function nestedInteractiveMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const role = getRole(virtualNode);
  if (!role) {
    return false;
  }

  return !!(standards as any).ariaRoles[role].childrenPresentational;
}

export default nestedInteractiveMatches;
