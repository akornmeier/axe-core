import { isHiddenForEveryone } from '../../commons/dom';

function accesskeysEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  vNode: any
): boolean {
  if (!isHiddenForEveryone(vNode)) {
    this.data(vNode.attr('accesskey'));
    this.relatedNodes([node]);
  }
  return true;
}

export default accesskeysEvaluate;
