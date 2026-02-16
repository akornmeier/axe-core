function hasAltEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const { nodeName } = virtualNode.props;
  if (!['img', 'input', 'area'].includes(nodeName)) {
    return false;
  }

  return virtualNode.hasAttr('alt');
}

export default hasAltEvaluate;
