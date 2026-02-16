import * as dom from '../../commons/dom';
import { hasChildTextNodes } from '../../commons/dom/has-content-virtual';
import { getRole } from '../../commons/aria';
import * as standards from '../../commons/standards';
import matches from '../../commons/matches';
import cache from '../../core/base/cache';

declare const axe: any;

const implicitAriaLiveRoles = ['alert', 'log', 'status'];

export default function regionEvaluate(
  this: any,
  node: HTMLElement,
  options: any,
  virtualNode: any
): boolean {
  this.data({
    isIframe: ['iframe', 'frame'].includes(virtualNode.props.nodeName)
  });

  const regionlessNodes = cache.get('regionlessNodes', () =>
    getRegionlessNodes(options)
  ) as any[];

  return !regionlessNodes.includes(virtualNode);
}

function getRegionlessNodes(options: any): any[] {
  const regionlessNodes = findRegionlessElms(axe._tree[0], options)
    .map((vNode: any) => {
      while (
        vNode.parent &&
        !vNode.parent._hasRegionDescendant &&
        vNode.parent.actualNode !== document.body
      ) {
        vNode = vNode.parent;
      }

      return vNode;
    })
    .filter((vNode: any, index: number, array: any[]) => {
      return array.indexOf(vNode) === index;
    });
  return regionlessNodes;
}

function findRegionlessElms(virtualNode: any, options: any): any[] {
  const node = virtualNode.actualNode;
  if (
    getRole(virtualNode) === 'button' ||
    isRegion(virtualNode, options) ||
    ['iframe', 'frame'].includes(virtualNode.props.nodeName) ||
    (dom.isSkipLink(virtualNode.actualNode) &&
      dom.getElementByReference(virtualNode.actualNode, 'href')) ||
    !dom.isVisibleToScreenReaders(node)
  ) {
    let vNode = virtualNode;
    while (vNode) {
      vNode._hasRegionDescendant = true;
      vNode = vNode.parent;
    }
    if (['iframe', 'frame'].includes(virtualNode.props.nodeName)) {
      return [virtualNode];
    }
    return [];
  } else if (
    node !== document.body &&
    dom.hasContent(node, /* noRecursion: */ true) &&
    !isShallowlyHidden(virtualNode)
  ) {
    return [virtualNode];
  } else {
    return virtualNode.children
      .filter(({ actualNode }: any) => actualNode.nodeType === 1)
      .map((vNode: any) => findRegionlessElms(vNode, options))
      .reduce((a: any[], b: any[]) => a.concat(b), []);
  }
}

function isShallowlyHidden(virtualNode: any): boolean {
  return (
    ['none', 'presentation'].includes(getRole(virtualNode) ?? '') &&
    !hasChildTextNodes(virtualNode)
  );
}

function isRegion(virtualNode: any, options: any): boolean {
  const node = virtualNode.actualNode;
  const role = getRole(virtualNode);
  const ariaLive = (node.getAttribute('aria-live') || '').toLowerCase().trim();
  const landmarkRoles = standards.getAriaRolesByType('landmark');

  if (
    ['assertive', 'polite'].includes(ariaLive) ||
    implicitAriaLiveRoles.includes(role ?? '')
  ) {
    return true;
  }

  if (landmarkRoles.includes(role ?? '')) {
    return true;
  }

  if (options.regionMatcher && matches(virtualNode, options.regionMatcher)) {
    return true;
  }

  return false;
}
