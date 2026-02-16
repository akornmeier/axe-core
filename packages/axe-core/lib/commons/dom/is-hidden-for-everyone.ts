import { nodeLookup } from '../../core/utils';
import memoize from '../../core/utils/memoize';
import {
  nativelyHidden,
  displayHidden,
  visibilityHidden,
  contentVisibiltyHidden,
  detailsHidden
} from './visibility-methods';

interface IsHiddenOptions {
  skipAncestors?: boolean | undefined;
  isAncestor?: boolean | undefined;
}

const hiddenMethods = [
  displayHidden,
  visibilityHidden,
  contentVisibiltyHidden,
  detailsHidden
];

/**
 * Determine if an element is hidden from screenreaders and visual users
 * @method isHiddenForEveryone
 * @memberof axe.commons.dom
 * @param {VirtualNode} vNode The Virtual Node
 * @param {Object} [options]
 * @param {Boolean} [options.skipAncestors] If the ancestor tree should be not be used
 * @param {Boolean} [options.isAncestor] If this function is being called on an ancestor for the target node
 * @return {Boolean} The element's visibility state
 */
export default function isHiddenForEveryone(
  vNode: any,
  { skipAncestors, isAncestor = false }: IsHiddenOptions = {}
): boolean {
  vNode = nodeLookup(vNode).vNode;

  if (skipAncestors) {
    return isHiddenSelf(vNode, isAncestor);
  }

  return isHiddenAncestors(vNode, isAncestor);
}

/**
 * Check the element for visibility state
 */
const isHiddenSelf: (vNode: any, isAncestor: boolean) => boolean = memoize(
  function isHiddenSelfMemoized(vNode: any, isAncestor: boolean): boolean {
    if (nativelyHidden(vNode)) {
      return true;
    }

    if (!vNode.actualNode) {
      return false;
    }

    if (hiddenMethods.some(method => method(vNode, { isAncestor }))) {
      return true;
    }

    // detached node
    if (!vNode.actualNode.isConnected) {
      return true;
    }

    return false;
  }
);

/**
 * Check the element and ancestors for visibility state
 */
const isHiddenAncestors: (vNode: any, isAncestor: boolean) => boolean = memoize(
  function isHiddenAncestorsMemoized(vNode: any, isAncestor: boolean): boolean {
    if (isHiddenSelf(vNode, isAncestor)) {
      return true;
    }

    if (!vNode.parent) {
      return false;
    }

    return isHiddenAncestors(vNode.parent, true);
  }
);
