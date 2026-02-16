import { nodeLookup } from '../../core/utils';
import memoize from '../../core/utils/memoize';
import isHiddenForEveryone from './is-hidden-for-everyone';
import {
  opacityHidden,
  scrollHidden,
  overflowHidden,
  clipHidden,
  areaHidden
} from './visibility-methods';
import isOffscreen from './is-offscreen';

const hiddenMethods = [
  opacityHidden,
  scrollHidden,
  overflowHidden,
  clipHidden,
  isOffscreen
];

/**
 * Determine if an element is visible on screen
 * @method isVisibleOnScreen
 * @memberof axe.commons.dom
 * @param {VirtualNode} vNode The Virtual Node
 * @return {Boolean} True if the element is visible on screen
 */
export default function isVisibleOnScreen(vNode: any): boolean {
  vNode = nodeLookup(vNode).vNode;
  return isVisibleOnScreenVirtual(vNode);
}

const isVisibleOnScreenVirtual: (vNode: any, isAncestor?: boolean) => boolean =
  memoize(function isVisibleOnScreenMemoized(
    vNode: any,
    isAncestor?: boolean
  ): boolean {
    if (vNode.actualNode && vNode.props.nodeName === 'area') {
      return !areaHidden(vNode, isVisibleOnScreenVirtual);
    }

    if (isHiddenForEveryone(vNode, { skipAncestors: true, isAncestor })) {
      return false;
    }

    if (
      vNode.actualNode &&
      hiddenMethods.some(method =>
        method(vNode, { isAncestor: isAncestor ?? false })
      )
    ) {
      return false;
    }

    if (!vNode.parent) {
      return true;
    }

    return isVisibleOnScreenVirtual(vNode.parent, true);
  });
