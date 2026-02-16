import getExplicitRole from '../aria/get-explicit-role';

const rangeRoles: readonly string[] = [
  'progressbar',
  'scrollbar',
  'slider',
  'spinbutton'
];

/**
 * Determines if an element is an aria range element
 * @method isAriaRange
 * @memberof axe.commons.forms
 * @param node Node to determine if aria range
 * @returns whether or not the node is an aria range element
 */
function isAriaRange(node: unknown): boolean {
  const role = getExplicitRole(node);
  return !!role && rangeRoles.includes(role);
}

export default isAriaRange;
