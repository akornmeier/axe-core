import { isValidAutocomplete } from '../../commons/text';

function autocompleteValidEvaluate(
  _node: HTMLElement,
  options: any,
  virtualNode: any
): boolean | undefined {
  const autocomplete = virtualNode.attr('autocomplete') || '';
  return isValidAutocomplete(autocomplete, options);
}

export default autocompleteValidEvaluate;
