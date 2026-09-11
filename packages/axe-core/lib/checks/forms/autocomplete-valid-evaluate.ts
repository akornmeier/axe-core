import { isValidAutocomplete } from '../../commons/text';

function autocompleteValidEvaluate(
  _node: HTMLElement,
  options: any,
  virtualNode: any
): boolean {
  const autocomplete = virtualNode.attr('autocomplete') || '';
  return isValidAutocomplete(autocomplete, options) ?? false;
}

export default autocompleteValidEvaluate;
