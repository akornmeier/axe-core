import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

export default function summaryIsInteractiveMatches(
  _: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  // Summary only interactive if its real DOM parent is a details element
  const parent = virtualNode.parent!;
  if (parent.props.nodeName !== 'details' || isSlottedElm(virtualNode)) {
    return false;
  }
  // Only the first summary element is interactive
  const firstSummary = (parent as any).children.find(
    (child: AbstractVirtualNode) => child.props.nodeName === 'summary'
  );
  if (firstSummary !== virtualNode) {
    return false;
  }
  return true;
}

function isSlottedElm(vNode: AbstractVirtualNode): boolean {
  // Normally this wouldn't be enough, but since we know parent is a details
  // element, we can ignore edge cases like slot being the real parent
  const domParent = (vNode as any).actualNode?.parentElement;
  return domParent && domParent !== (vNode.parent as any).actualNode;
}
