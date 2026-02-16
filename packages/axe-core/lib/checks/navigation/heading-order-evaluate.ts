import cache from '../../core/base/cache';
import { querySelectorAllFilter, getAncestry } from '../../core/utils';
import { isVisibleToScreenReaders } from '../../commons/dom';
import { getRole } from '../../commons/aria';

declare const axe: any;

function getLevel(vNode: any): number {
  const role = getRole(vNode);
  const headingRole = role && role.includes('heading');
  const ariaHeadingLevel = vNode.attr('aria-level');
  const ariaLevel = parseInt(ariaHeadingLevel, 10);

  const [, headingLevel] = vNode.props.nodeName.match(/h(\d)/) || [];

  if (!headingRole) {
    return -1;
  }

  if (headingLevel && !ariaHeadingLevel) {
    return parseInt(headingLevel, 10);
  }

  if (isNaN(ariaLevel) || ariaLevel < 1) {
    if (headingLevel) {
      return parseInt(headingLevel, 10);
    }
    return 2;
  }

  if (ariaLevel) {
    return ariaLevel;
  }

  return -1;
}

function headingOrderEvaluate(this: any): boolean {
  let headingOrder = cache.get('headingOrder');
  if (headingOrder) {
    return true;
  }

  const selector = 'h1, h2, h3, h4, h5, h6, [role=heading], iframe, frame';
  // TODO: es-modules_tree
  const vNodes = querySelectorAllFilter(
    axe._tree[0],
    selector,
    isVisibleToScreenReaders
  );

  headingOrder = vNodes.map((vNode: any) => {
    return {
      ancestry: [getAncestry(vNode.actualNode)],
      level: getLevel(vNode)
    };
  });
  this.data({ headingOrder });
  cache.set('headingOrder', vNodes);
  return true;
}

export default headingOrderEvaluate;
