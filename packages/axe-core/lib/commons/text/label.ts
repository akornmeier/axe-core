import labelVirtual from './label-virtual';
import { getNodeFromTree } from '../../core/utils';

/**
 * Finds virtual node and calls labelVirtual()
 * IMPORTANT: This method requires the composed tree at axe._tree
 * @see axe.commons.text.virtualLabel
 * @method label
 * @memberof axe.commons.text
 * @instance
 * @param  {Element} node The virtual node mapping to the input to test
 * @return {Mixed} String of visible text, or `null` if no label is found
 */
function label(node: Element): string | null {
  const virtualNode = getNodeFromTree(node);
  return labelVirtual(virtualNode);
}

export default label;
