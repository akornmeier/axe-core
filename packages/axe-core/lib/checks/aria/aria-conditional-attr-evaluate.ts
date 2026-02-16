import getRole from '../../commons/aria/get-role';
import ariaConditionalCheckboxAttr from './aria-conditional-checkbox-attr-evaluate';
import ariaConditionalRowAttr from './aria-conditional-row-attr-evaluate';

const conditionalRoleMap: Record<string, any> = {
  row: ariaConditionalRowAttr,
  checkbox: ariaConditionalCheckboxAttr
};

export default function ariaConditionalAttrEvaluate(
  this: any,
  node: HTMLElement,
  options: any,
  virtualNode: any
): boolean {
  const role = getRole(virtualNode);
  if (!role || !conditionalRoleMap[role]) {
    return true;
  }
  return conditionalRoleMap[role].call(this, node, options, virtualNode);
}
