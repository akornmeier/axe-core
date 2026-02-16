import matches from '../../commons/matches';

function matchesDefinitionEvaluate(
  _: HTMLElement,
  options: any,
  virtualNode: any
): boolean {
  return matches(virtualNode, options.matcher);
}

export default matchesDefinitionEvaluate;
