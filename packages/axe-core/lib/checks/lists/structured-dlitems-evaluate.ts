function structuredDlitemsEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const children = virtualNode.children;
  if (!children || !children.length) {
    return false;
  }

  let hasDt = false,
    hasDd = false,
    nodeName: string;
  for (let i = 0; i < children.length; i++) {
    nodeName = children[i].props.nodeName.toUpperCase();
    if (nodeName === 'DT') {
      hasDt = true;
    }
    if (hasDt && nodeName === 'DD') {
      return false;
    }
    if (nodeName === 'DD') {
      hasDd = true;
    }
  }

  return hasDt || hasDd;
}

export default structuredDlitemsEvaluate;
