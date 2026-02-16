import { requiredContext, getExplicitRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function ariaRequiredParentMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const role = getExplicitRole(virtualNode);
  return !!requiredContext(role ?? '');
}

export default ariaRequiredParentMatches;
