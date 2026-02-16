import { sanitize } from '../../commons/text';

function attrNonSpaceContentEvaluate(
  this: any,
  node: HTMLElement,
  options: any = {},
  vNode: any
): boolean {
  if (!options.attribute || typeof options.attribute !== 'string') {
    throw new TypeError(
      'attr-non-space-content requires options.attribute to be a string'
    );
  }

  if (!vNode.hasAttr(options.attribute)) {
    this.data({
      messageKey: 'noAttr'
    });
    return false;
  }

  const attribute = vNode.attr(options.attribute);
  const attributeIsEmpty = !sanitize(attribute);
  if (attributeIsEmpty) {
    this.data({
      messageKey: 'emptyAttr'
    });
    return false;
  }
  return true;
}

export default attrNonSpaceContentEvaluate;
