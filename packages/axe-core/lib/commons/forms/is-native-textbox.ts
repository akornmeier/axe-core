import { getNodeFromTree } from '../../core/utils';
import AbstractVirtuaNode from '../../core/base/virtual-node/abstract-virtual-node';

const nonTextInputTypes: readonly string[] = [
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'password',
  'radio',
  'reset',
  'submit'
];

/**
 * Determines if an element is a native textbox element
 * @method isNativeTextbox
 * @memberof axe.commons.forms
 * @param node Node to determine if textbox
 * @returns whether or not the node is a native textbox
 */
function isNativeTextbox(node: unknown): boolean {
  const vNode =
    node instanceof AbstractVirtuaNode
      ? (node as {
          props: { nodeName: string };
          attr(name: string): string | null;
        })
      : (getNodeFromTree(node) as {
          props: { nodeName: string };
          attr(name: string): string | null;
        });
  const nodeName = vNode.props.nodeName;
  return (
    nodeName === 'textarea' ||
    (nodeName === 'input' &&
      !nonTextInputTypes.includes((vNode.attr('type') || '').toLowerCase()))
  );
}

export default isNativeTextbox;
