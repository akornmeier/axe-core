import { isVisibleOnScreen } from '../commons/dom';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

export default function isVisibleOnScreenMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  return isVisibleOnScreen(virtualNode);
}
