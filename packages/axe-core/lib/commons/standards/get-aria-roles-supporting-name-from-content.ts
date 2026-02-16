import cache from '../../core/base/cache';
import standards from '../../standards';

/**
 * Return a list of aria roles which are name from content.
 * @returns List of all roles with name from content
 */
function getAriaRolesSupportingNameFromContent(): string[] {
  return cache.get('ariaRolesNameFromContent', () =>
    Object.keys(standards.ariaRoles).filter(roleName => {
      return standards.ariaRoles[roleName]?.nameFromContent;
    })
  ) as string[];
}

export default getAriaRolesSupportingNameFromContent;
