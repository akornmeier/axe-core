import { sanitize } from '../../commons/text';

function uniqueFrameTitleEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  vNode: any
): boolean {
  const title = sanitize(vNode.attr('title')).toLowerCase();
  this.data(title);
  return true;
}

export default uniqueFrameTitleEvaluate;
