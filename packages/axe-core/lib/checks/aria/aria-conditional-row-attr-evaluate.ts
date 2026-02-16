import getRole from '../../commons/aria/get-role';
import { closest } from '../../core/utils';

export default function ariaConditionalRowAttr(
  this: any,
  node: HTMLElement,
  { invalidTableRowAttrs }: any = {},
  virtualNode: any
): boolean {
  const invalidAttrs =
    invalidTableRowAttrs?.filter?.((invalidAttr: string) => {
      return virtualNode.hasAttr(invalidAttr);
    }) ?? [];
  if (invalidAttrs.length === 0) {
    return true;
  }

  const owner = getRowOwner(virtualNode);
  const ownerRole = owner && getRole(owner);
  if (!ownerRole || ownerRole === 'treegrid') {
    return true;
  }

  const messageKey = `row${invalidAttrs.length > 1 ? 'Plural' : 'Singular'}`;
  this.data({ messageKey, invalidAttrs, ownerRole });
  return false;
}

function getRowOwner(virtualNode: any): any {
  // check if the parent exists otherwise a TypeError will occur (virtual-nodes specifically)
  if (!virtualNode.parent) {
    return;
  }
  const rowOwnerQuery =
    'table:not([role]), [role~="treegrid"], [role~="table"], [role~="grid"]';
  return closest(virtualNode, rowOwnerQuery);
}
