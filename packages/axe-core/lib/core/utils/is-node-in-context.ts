import contains from './contains';

interface VNode {
  shadowId?: string;
  actualNode?: Node;
  nodeIndex: number;
  parent?: VNode | null;
}

/**
 * Determines if a node is included or excluded in a given context
 */
export default function isNodeInContext(
  node: VNode,
  { include = [], exclude = [] }: { include?: VNode[]; exclude?: VNode[] }
): boolean {
  const filterInclude = include.filter(candidate => contains(candidate, node));
  if (filterInclude.length === 0) {
    return false;
  }
  const filterExcluded = exclude.filter(candidate => contains(candidate, node));
  if (filterExcluded.length === 0) {
    return true;
  }
  const deepestInclude = getDeepest(filterInclude)!;
  const deepestExclude = getDeepest(filterExcluded)!;
  return contains(deepestExclude, deepestInclude);
}

function getDeepest(collection: VNode[]): VNode | undefined {
  let deepest: VNode | undefined;
  for (const node of collection) {
    if (!deepest || !contains(node, deepest)) {
      deepest = node;
    }
  }
  return deepest;
}
