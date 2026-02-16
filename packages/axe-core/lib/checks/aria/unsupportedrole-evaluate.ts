import { isUnsupportedRole, getRole } from '../../commons/aria';

/**
 * Check that an elements semantic role is unsupported.
 *
 * Unsupported roles are taken from the `ariaRoles` standards object from the roles `unsupported` property.
 *
 * @memberof checks
 * @return {Boolean} True if the elements semantic role is unsupported. False otherwise.
 */
function unsupportedroleEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const role = getRole(virtualNode, { dpub: true, fallback: true });
  const isUnsupported = isUnsupportedRole(role ?? '');
  if (isUnsupported) {
    this.data(role);
  }
  return isUnsupported;
}

export default unsupportedroleEvaluate;
