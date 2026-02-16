import { parseTabindex } from '../../core/utils';

function tabindexEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const tabIndex = parseTabindex(virtualNode.attr('tabindex'));

  // an invalid tabindex will either return 0 or -1 (based on the element) so
  // will never be above 0
  // @see https://www.w3.org/TR/html51/editing.html#the-tabindex-attribute
  return tabIndex === null || tabIndex <= 0;
}

export default tabindexEvaluate;
