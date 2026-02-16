import isFocusable from '../../commons/dom/is-focusable';
import { getRoleType } from '../../commons/aria';
import { parseTabindex } from '../../core/utils';

export default function noFocusableContentEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  if (!virtualNode.children) {
    return undefined;
  }

  try {
    const focusableDescendants = getFocusableDescendants(virtualNode);

    if (!focusableDescendants.length) {
      return true;
    }

    const notHiddenElements = focusableDescendants.filter(
      usesUnreliableHidingStrategy
    );

    if (notHiddenElements.length > 0) {
      this.data({ messageKey: 'notHidden' });
      this.relatedNodes(notHiddenElements);
    } else {
      this.relatedNodes(focusableDescendants);
    }

    return false;
  } catch {
    return undefined;
  }
}

function getFocusableDescendants(vNode: any): any[] {
  if (!vNode.children) {
    if (vNode.props.nodeType === 1) {
      throw new Error('Cannot determine children');
    }

    return [];
  }

  const retVal: any[] = [];
  vNode.children.forEach((child: any) => {
    if (getRoleType(child) === 'widget' && isFocusable(child)) {
      retVal.push(child);
    } else {
      retVal.push(...getFocusableDescendants(child));
    }
  });
  return retVal;
}

function usesUnreliableHidingStrategy(vNode: any): boolean {
  const tabIndex = parseTabindex(vNode.attr('tabindex'));
  return tabIndex !== null && tabIndex < 0;
}
