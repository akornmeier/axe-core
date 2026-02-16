function altSpaceValueEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const alt = virtualNode.attr('alt');
  const isOnlySpace = /^\s+$/;
  return typeof alt === 'string' && isOnlySpace.test(alt);
}

export default altSpaceValueEvaluate;
