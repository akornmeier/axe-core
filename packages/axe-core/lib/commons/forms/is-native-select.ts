import { getNodeFromTree } from '../../core/utils';
import AbstractVirtuaNode from '../../core/base/virtual-node/abstract-virtual-node';

/**
 * Determines if an element is a native select element
 * @method isNativeSelect
 * @memberof axe.commons.forms
 * @param node Node to determine if select
 * @returns whether or not the node is a native select
 */
function isNativeSelect(node: unknown): boolean {
  const vNode =
    node instanceof AbstractVirtuaNode
      ? (node as { props: { nodeName: string } })
      : (getNodeFromTree(node) as { props: { nodeName: string } });
  const nodeName = vNode.props.nodeName;
  return nodeName === 'select';
}

export default isNativeSelect;
