import getExplicitRole from '../aria/get-explicit-role';

/**
 * Determines if an element is an aria listbox element
 * @method isAriaListbox
 * @memberof axe.commons.forms
 * @param node Node to determine if aria listbox
 * @returns whether or not the node is an aria listbox
 */
function isAriaListbox(node: unknown): boolean {
  const role = getExplicitRole(node);
  return role === 'listbox';
}

export default isAriaListbox;
