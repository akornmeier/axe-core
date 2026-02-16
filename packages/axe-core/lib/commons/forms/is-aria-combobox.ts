import getExplicitRole from '../aria/get-explicit-role';

/**
 * Determines if an element is an aria combobox element
 * @method isAriaCombobox
 * @memberof axe.commons.forms
 * @param node Node to determine if aria combobox
 * @returns whether or not the node is an aria combobox
 */
function isAriaCombobox(node: unknown): boolean {
  const role = getExplicitRole(node);
  return role === 'combobox';
}

export default isAriaCombobox;
