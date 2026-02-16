import memoize from '../../core/utils/memoize';

/**
 * Get all ancestor nodes (including the passed in node) that have overflow:hidden
 * @method getOverflowHiddenAncestors
 * @memberof axe.commons.dom
 * @param {VirtualNode} vNode
 * @returns {VirtualNode[]}
 */
const getOverflowHiddenAncestors: (vNode: any) => any[] = memoize(
  function getOverflowHiddenAncestorsMemoized(vNode: any): any[] {
    const ancestors: any[] = [];

    if (!vNode) {
      return ancestors;
    }

    const overflow: string = vNode.getComputedStylePropertyValue('overflow');

    if (overflow === 'hidden') {
      ancestors.push(vNode);
    }

    return ancestors.concat(getOverflowHiddenAncestors(vNode.parent));
  }
);

export default getOverflowHiddenAncestors;
