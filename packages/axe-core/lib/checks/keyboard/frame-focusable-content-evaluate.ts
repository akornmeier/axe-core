import { isInTabOrder } from '../../commons/dom';

export default function frameFocusableContentEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  if (!virtualNode.children) {
    return undefined;
  }

  try {
    return !virtualNode.children.some((child: any) => {
      return focusableDescendants(child);
    });
  } catch {
    return undefined;
  }
}

function focusableDescendants(vNode: any): boolean {
  if (isInTabOrder(vNode)) {
    return true;
  }

  if (!vNode.children) {
    if (vNode.props.nodeType === 1) {
      throw new Error('Cannot determine children');
    }

    return false;
  }

  return vNode.children.some((child: any) => {
    return focusableDescendants(child);
  });
}
