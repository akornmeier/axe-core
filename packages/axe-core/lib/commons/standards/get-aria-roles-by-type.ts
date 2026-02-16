import standards from '../../standards';

/**
 * Return a list of aria roles whose type matches the provided value.
 * @param type - The desired role type
 * @returns List of all roles matching the type
 */
function getAriaRolesByType(type: string): string[] {
  return Object.keys(standards.ariaRoles).filter(roleName => {
    return standards.ariaRoles[roleName]?.type === type;
  });
}

export default getAriaRolesByType;
