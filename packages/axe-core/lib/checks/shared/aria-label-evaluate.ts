import { sanitize } from '../../commons/text';
import { arialabelText } from '../../commons/aria';

function ariaLabelEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  return !!sanitize(arialabelText(virtualNode));
}

export default ariaLabelEvaluate;
