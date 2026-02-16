import { getRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

export default function headingMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return getRole(virtualNode) === 'heading';
}
