import { isInTabOrder } from '../../commons/dom';
import { accessibleTextVirtual } from '../../commons/text';

function focusableNoNameEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  if (!isInTabOrder(virtualNode)) {
    return false;
  }

  try {
    return !accessibleTextVirtual(virtualNode);
  } catch {
    return undefined;
  }
}

export default focusableNoNameEvaluate;
