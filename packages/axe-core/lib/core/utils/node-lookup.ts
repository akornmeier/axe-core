import AbstractVirtualNode from '../base/virtual-node/abstract-virtual-node';
import getNodeFromTree from './get-node-from-tree';

export default function nodeLookup(node: unknown): {
  vNode: unknown;
  domNode: Node | undefined;
} {
  if (node instanceof AbstractVirtualNode) {
    return {
      vNode: node,
      domNode: (node as AbstractVirtualNode & { actualNode?: Node }).actualNode
    };
  }

  return {
    vNode: getNodeFromTree(node as Node),
    domNode: node as Node
  };
}
