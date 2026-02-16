/**
 * Check that the element does not have the `aria-hidden` attribute.
 *
 * @memberof checks
 * @return {Boolean} True if the `aria-hidden` attribute is not present. False otherwise.
 */
function ariaHiddenBodyEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  return virtualNode.attr('aria-hidden') !== 'true';
}

export default ariaHiddenBodyEvaluate;
