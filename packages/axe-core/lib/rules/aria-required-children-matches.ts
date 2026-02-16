import { requiredOwned, getExplicitRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function ariaRequiredChildrenMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const role = getExplicitRole(virtualNode, { dpub: true });
  return !!requiredOwned(role ?? '');
}

export default ariaRequiredChildrenMatches;
