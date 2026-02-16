import getExplicitRole from '../aria/get-explicit-role';

/**
 * Determines if an element is an aria textbox element
 * @method isAriaTextbox
 * @memberof axe.commons.forms
 * @param node Node to determine if aria textbox
 * @returns whether or not the node is an aria textbox
 */
function isAriaTextbox(node: unknown): boolean {
  const role = getExplicitRole(node);
  return role === 'textbox';
}

export default isAriaTextbox;
