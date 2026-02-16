import { getRole } from '../commons/aria';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

export default function tableOrGridRoleMatches(
  _: HTMLElement,
  vNode: AbstractVirtualNode
): boolean {
  const role = getRole(vNode);
  return ['treegrid', 'grid', 'table'].includes(role ?? '');
}
