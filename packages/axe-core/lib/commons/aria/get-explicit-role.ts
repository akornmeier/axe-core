import isValidRole from './is-valid-role';
import { getNodeFromTree, tokenList } from '../../core/utils';
import AbstractVirtuaNode from '../../core/base/virtual-node/abstract-virtual-node';

interface ExplicitRoleOptions {
  fallback?: boolean;
  abstracts?: boolean;
  dpub?: boolean;
}

function getExplicitRole(
  vNode: any,
  { fallback, abstracts, dpub }: ExplicitRoleOptions = {}
): string | null {
  vNode = vNode instanceof AbstractVirtuaNode ? vNode : getNodeFromTree(vNode);

  if (vNode.props.nodeType !== 1) {
    return null;
  }

  const roleAttr = (vNode.attr('role') || '').trim().toLowerCase();
  const roleList = fallback ? tokenList(roleAttr) : [roleAttr];

  // Get the first valid role:
  const firstValidRole = roleList.find((role: string) => {
    if (!dpub && role.substr(0, 4) === 'doc-') {
      return false;
    }
    return isValidRole(role, { allowAbstract: abstracts });
  });

  return firstValidRole || null;
}

export default getExplicitRole;
