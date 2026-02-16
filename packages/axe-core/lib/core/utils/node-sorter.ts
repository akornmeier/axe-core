/**
 * Array#sort callback to sort nodes by DOM order
 */
function nodeSorter(
  nodeA: Node | { actualNode: Node },
  nodeB: Node | { actualNode: Node }
): number {
  /*eslint no-bitwise: 0 */
  const a = (nodeA as { actualNode?: Node }).actualNode || (nodeA as Node);
  const b = (nodeB as { actualNode?: Node }).actualNode || (nodeB as Node);
  if (a === b) {
    return 0;
  }

  if (a.compareDocumentPosition(b) & 4) {
    return -1;
  } else {
    return 1;
  }
}

export default nodeSorter;
