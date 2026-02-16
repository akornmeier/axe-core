import AbstractVirtualNode from '../base/virtual-node/abstract-virtual-node';
import getNodeFromTree from './get-node-from-tree';

export default function nodeLookup(node: unknown): {
  vNode: unknown;
  domNode: Node | null;
} {
  if (node instanceof AbstractVirtualNode) {
    return {
      vNode: node,
      domNode:
        (node as AbstractVirtualNode & { actualNode?: Node }).actualNode ?? null
    };
  }

  return {
    vNode: getNodeFromTree(node as Node),
    domNode: node as Node
  };
}
