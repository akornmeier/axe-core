export default function ariaConditionalCheckboxAttr(
  this: any,
  node: HTMLElement,
  options: any,
  virtualNode: any
): boolean {
  const { nodeName, type } = virtualNode.props;
  const ariaChecked = normalizeAriaChecked(virtualNode.attr('aria-checked'));
  if (nodeName !== 'input' || type !== 'checkbox' || !ariaChecked) {
    return true;
  }

  const checkState = getCheckState(virtualNode);
  if (ariaChecked === checkState) {
    return true;
  }
  this.data({
    messageKey: 'checkbox',
    checkState
  });
  return false;
}

function getCheckState(vNode: any): string {
  if (vNode.props.indeterminate) {
    return 'mixed';
  }
  return vNode.props.checked ? 'true' : 'false';
}

function normalizeAriaChecked(ariaCheckedVal: string | null): string {
  if (!ariaCheckedVal) {
    return '';
  }
  ariaCheckedVal = ariaCheckedVal.toLowerCase();
  if (['mixed', 'true'].includes(ariaCheckedVal)) {
    return ariaCheckedVal;
  }
  return 'false';
}
