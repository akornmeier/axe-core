import { isFocusable } from '../../commons/dom';

function isElementFocusableEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  return isFocusable(virtualNode);
}

export default isElementFocusableEvaluate;
