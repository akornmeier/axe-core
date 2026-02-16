import isShadowRoot from './is-shadow-root';
import AbstractVirtualNode from '../base/virtual-node/abstract-virtual-node';
import VirtualNode from '../base/virtual-node/virtual-node';
import cache from '../base/cache';
import { cacheNodeSelectors } from './selector-cache';

let hasShadowRoot: boolean;

export default function getFlattenedTree(
  node: Node = document.documentElement,
  shadowId?: string
): unknown[] {
  hasShadowRoot = false;
  const selectorMap: Record<string, unknown> = {};
  cache.set('nodeMap', new WeakMap());
  cache.set('selectorMap', selectorMap);

  const tree = flattenTree(node, shadowId, null)!;
  (tree[0] as Record<string, unknown>)._selectorMap = selectorMap;
  (tree[0] as Record<string, unknown>)._hasShadowRoot = hasShadowRoot;

  return tree;
}

function getSlotChildren(node: Node): Node[] {
  const childNodes: Node[] = [];
  let child: Node | null = node.firstChild;
  while (child) {
    childNodes.push(child);
    child = child.nextSibling;
  }
  return childNodes;
}

function createNode(node: Node, parent: unknown, shadowId?: string): unknown {
  const vNode = new VirtualNode(
    node as Node & Element,
    parent as AbstractVirtualNode | undefined,
    shadowId
  );
  cacheNodeSelectors(
    vNode as unknown as Parameters<typeof cacheNodeSelectors>[0],
    cache.get('selectorMap') as Parameters<typeof cacheNodeSelectors>[1]
  );
  return vNode;
}

function createChildren(
  childNodes: Node[],
  parent: unknown,
  shadowId?: string
): unknown[] {
  const children: unknown[] = [];
  childNodes.forEach(childNode => {
    const child = flattenTree(childNode, shadowId, parent);
    if (child) {
      children.push(...child);
    }
  });
  return children;
}

function flattenTree(
  node: Node,
  shadowId: string | undefined,
  parent: unknown
): unknown[] | undefined {
  let vNode: unknown, childNodes: Node[];

  if ((node as Document).documentElement) {
    node = (node as Document).documentElement;
  }
  const nodeName = node.nodeName.toLowerCase();

  if (isShadowRoot(node as Element)) {
    hasShadowRoot = true;
    vNode = createNode(node, parent, shadowId);
    shadowId = 'a' + Math.random().toString().substring(2);
    childNodes = Array.from((node as Element).shadowRoot!.childNodes);
    (vNode as Record<string, unknown>).children = createChildren(
      childNodes,
      vNode,
      shadowId
    );
    return [vNode];
  }

  if (
    nodeName === 'content' &&
    typeof (node as unknown as Record<string, unknown>).getDistributedNodes ===
      'function'
  ) {
    childNodes = Array.from(
      (
        node as unknown as { getDistributedNodes: () => NodeList }
      ).getDistributedNodes()
    );
    return createChildren(childNodes, parent, shadowId);
  }

  if (
    nodeName === 'slot' &&
    typeof (node as HTMLSlotElement).assignedNodes === 'function'
  ) {
    childNodes = Array.from((node as HTMLSlotElement).assignedNodes());
    if (!childNodes.length) {
      childNodes = getSlotChildren(node);
    }

    const styl = window.getComputedStyle(node as Element);

    // check the display property. intentionally does not run, see notable information at top of file
    if (false && styl.display !== 'contents') {
      vNode = createNode(node, parent, shadowId);
      (vNode as Record<string, unknown>).children = createChildren(
        childNodes,
        vNode,
        shadowId
      );
      return [vNode];
    }

    return createChildren(childNodes, parent, shadowId);
  }

  if (node.nodeType === document.ELEMENT_NODE) {
    vNode = createNode(node, parent, shadowId);
    childNodes = Array.from(node.childNodes);
    (vNode as Record<string, unknown>).children = createChildren(
      childNodes,
      vNode,
      shadowId
    );
    return [vNode];
  }

  if (node.nodeType === document.TEXT_NODE) {
    return [createNode(node, parent)];
  }

  return undefined;
}
