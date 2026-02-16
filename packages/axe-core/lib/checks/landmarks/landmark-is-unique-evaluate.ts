import { getRole } from '../../commons/aria';
import { accessibleTextVirtual } from '../../commons/text';

function landmarkIsUniqueEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const role = getRole(node);
  let accessibleText = accessibleTextVirtual(virtualNode);
  accessibleText = accessibleText ? accessibleText.toLowerCase() : '';
  this.data({ role: role, accessibleText: accessibleText });
  this.relatedNodes([node]);

  return true;
}

export default landmarkIsUniqueEvaluate;
