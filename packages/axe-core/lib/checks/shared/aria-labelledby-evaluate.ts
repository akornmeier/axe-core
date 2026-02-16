import { sanitize } from '../../commons/text';
import { arialabelledbyText } from '../../commons/aria';

function ariaLabelledbyEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  try {
    return !!sanitize(arialabelledbyText(virtualNode));
  } catch {
    return undefined;
  }
}

export default ariaLabelledbyEvaluate;
