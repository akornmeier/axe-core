import getRootNode from './get-root-node';
import { escapeSelector } from '../../core/utils';

interface FindElmsInContextParams {
  context: Node;
  value: string;
  attr: string;
  elm?: string;
}

/**
 * Find elements referenced from a given context
 * @method findElmsInContext
 * @memberof axe.commons.dom
 * @instance
 * @param {Object} element
 * @param {String} element.context Element in the same context
 * @param {String} element.value Attribute value to search for
 * @param {String} element.attr Attribute name to search for
 * @param {String} element.elm NodeName to search for (optional)
 * @return {Array<Node>}
 */
function findElmsInContext({
  context,
  value,
  attr,
  elm = ''
}: FindElmsInContextParams): Element[] {
  let root: Node;
  const escapedValue = escapeSelector(value);

  if (context.nodeType === 9 || context.nodeType === 11) {
    // It's already root
    root = context;
  } else {
    root = getRootNode(context);
  }
  return Array.from(
    (root as Document | DocumentFragment).querySelectorAll(
      elm + '[' + attr + '=' + escapedValue + ']'
    )
  );
}

export default findElmsInContext;
