import { isVisibleToScreenReaders } from '../../commons/dom';
import { getExplicitRole } from '../../commons/aria';

export default function invalidChildrenEvaluate(
  this: any,
  node: HTMLElement,
  options: any = {},
  virtualNode: any
): boolean | undefined {
  const relatedNodes: HTMLElement[] = [];
  const issues: string[] = [];
  if (!virtualNode.children) {
    return undefined;
  }

  const vChildren = mapWithNested(virtualNode.children);
  while (vChildren.length) {
    const { vChild, nested } = vChildren.shift()!;
    if (options.divGroups && !nested && isDivGroup(vChild)) {
      if (!vChild.children) {
        return undefined;
      }
      const vGrandChildren = mapWithNested(vChild.children, true);
      vChildren.push(...vGrandChildren);
      continue;
    }

    const issue = getInvalidSelector(vChild, nested, options);
    if (!issue) {
      continue;
    }
    if (!issues.includes(issue)) {
      issues.push(issue);
    }
    if (vChild?.actualNode?.nodeType === 1) {
      relatedNodes.push(vChild.actualNode);
    }
  }
  if (issues.length === 0) {
    return false;
  }

  this.data({ values: issues.join(', ') });
  this.relatedNodes(relatedNodes);
  return true;
}

function getInvalidSelector(
  vChild: any,
  nested: boolean,
  { validRoles = [], validNodeNames = [] }: any
): string | false {
  const { nodeName, nodeType, nodeValue } = vChild.props;
  const selector = nested ? 'div > ' : '';
  if (nodeType === 3 && nodeValue.trim() !== '') {
    return selector + `#text`;
  }
  if (nodeType !== 1 || !isVisibleToScreenReaders(vChild)) {
    return false;
  }

  const role = getExplicitRole(vChild);
  if (role) {
    return validRoles.includes(role) ? false : selector + `[role=${role}]`;
  } else {
    return validNodeNames.includes(nodeName) ? false : selector + nodeName;
  }
}

function isDivGroup(vNode: any): boolean {
  return vNode.props.nodeName === 'div' && getExplicitRole(vNode) === null;
}

function mapWithNested(
  vNodes: any[],
  nested = false
): Array<{ vChild: any; nested: boolean }> {
  return vNodes.map((vChild: any) => ({ vChild, nested }));
}
