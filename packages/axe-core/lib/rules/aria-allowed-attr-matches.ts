import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function ariaAllowedAttrMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const aria = /^aria-/;
  const attrs = virtualNode.attrNames;
  if (attrs.length) {
    for (let i = 0, l = attrs.length; i < l; i++) {
      if (aria.test(attrs[i]!)) {
        return true;
      }
    }
  }

  return false;
}

export default ariaAllowedAttrMatches;
