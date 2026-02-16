import memoize from '../../core/utils/memoize';
import getModalDialog from './get-modal-dialog';
import { contains } from '../../core/utils';

interface IsInertOptions {
  skipAncestors?: boolean | undefined;
  isAncestor?: boolean | undefined;
}

/**
 * Determines if an element is inside an inert subtree.
 * @param {VirtualNode} vNode
 * @param {Boolean} [options.skipAncestors] If the ancestor tree should not be used
 * @return {Boolean} The element's inert state
 */
export default function isInert(
  vNode: any,
  { skipAncestors, isAncestor }: IsInertOptions = {}
): boolean {
  if (skipAncestors) {
    return isInertSelf(vNode, isAncestor);
  }

  return isInertAncestors(vNode, isAncestor);
}

/**
 * Check the element for inert
 */
const isInertSelf: (vNode: any, isAncestor?: boolean) => boolean = memoize(
  function isInertSelfMemoized(vNode: any, isAncestor?: boolean): boolean {
    if (vNode.hasAttr('inert')) {
      return true;
    }

    if (!isAncestor && vNode.actualNode) {
      // elements outside of an opened modal
      // dialog are treated as inert by the
      // browser
      const modalDialog = getModalDialog();
      if (modalDialog && !contains(modalDialog, vNode)) {
        return true;
      }
    }

    return false;
  }
);

/**
 * Check the element and ancestors for inert
 */
const isInertAncestors: (vNode: any, isAncestor?: boolean) => boolean = memoize(
  function isInertAncestorsMemoized(vNode: any, isAncestor?: boolean): boolean {
    if (isInertSelf(vNode, isAncestor)) {
      return true;
    }

    if (!vNode.parent) {
      return false;
    }

    return isInertAncestors(vNode.parent, true);
  }
);
