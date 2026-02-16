import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function ariaHasAttrMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const aria = /^aria-/;

  return virtualNode.attrNames.some(attr => {
    return aria.test(attr);
  });
}

export default ariaHasAttrMatches;
