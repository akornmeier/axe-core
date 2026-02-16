import { getImplicitRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

/**
 * @deprecated Will be removed in axe-core 5.0.0
 */
function presentationRoleConflictMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return getImplicitRole(virtualNode, { chromium: true }) !== null;
}

export default presentationRoleConflictMatches;
