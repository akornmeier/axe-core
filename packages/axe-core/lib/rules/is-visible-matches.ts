import { isVisibleOnScreen } from '../commons/dom';

// @deprecated use isVisibleOnScreenMatches
export default function hasVisibleTextMatches(node: HTMLElement): boolean {
  return isVisibleOnScreen(node);
}
