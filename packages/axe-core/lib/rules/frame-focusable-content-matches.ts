import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

function frameFocusableContentMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode,
  context: {
    initiator: boolean;
    focusable: boolean;
    size?: { width: number; height: number };
    [key: string]: unknown;
  }
): boolean {
  return (
    !context.initiator &&
    !context.focusable &&
    (context.size?.width ?? 0) * (context.size?.height ?? 0) > 1
  );
}

export default frameFocusableContentMatches;
