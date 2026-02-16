import { isVisibleOnScreen } from '../../commons/dom';

function isOnScreenEvaluate(node: HTMLElement): boolean {
  // From a visual perspective
  return isVisibleOnScreen(node);
}

export default isOnScreenEvaluate;
