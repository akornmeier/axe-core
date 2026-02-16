import { labelVirtual, titleText } from '../../commons/text';

function titleOnlyEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const labelTextVal = labelVirtual(virtualNode);
  const title = titleText(virtualNode);
  const ariaDescribedBy = virtualNode.attr('aria-describedby');

  return !labelTextVal && !!(title || ariaDescribedBy);
}

export default titleOnlyEvaluate;
