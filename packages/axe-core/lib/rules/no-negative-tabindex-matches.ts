import { parseTabindex } from '../core/utils';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function noNegativeTabindexMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const tabindex = parseTabindex(virtualNode.attr('tabindex'));
  return tabindex === null || tabindex >= 0;
}

export default noNegativeTabindexMatches;
