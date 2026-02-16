import { accessibleTextVirtual } from '../commons/text';
import { getRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function identicalLinksSamePurposeMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const hasAccName = !!accessibleTextVirtual(virtualNode);
  if (!hasAccName) {
    return false;
  }

  const role = getRole(node);
  if (role && role !== 'link') {
    return false;
  }

  return true;
}

export default identicalLinksSamePurposeMatches;
