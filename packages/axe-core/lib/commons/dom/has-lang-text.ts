import { hasChildTextNodes } from './has-content-virtual';
import isVisualContent from './is-visual-content';
import isHiddenForEveryone from './is-hidden-for-everyone';

/**
 * Check that a node has text, or an accessible name which language is defined by the
 * nearest ancestor's lang attribute.
 * @param {VirtualNode} virtualNode
 * @return boolean
 */
export default function hasLangText(virtualNode: any): boolean {
  if (
    typeof virtualNode.children === 'undefined' ||
    hasChildTextNodes(virtualNode)
  ) {
    return true;
  }
  if (virtualNode.props.nodeType === 1 && isVisualContent(virtualNode)) {
    // See: https://github.com/dequelabs/axe-core/issues/3281
    return !!(axe as any).commons.text.accessibleTextVirtual(virtualNode);
  }
  return virtualNode.children.some(
    (child: any) =>
      !child.attr('lang') && // non-empty lang
      hasLangText(child) && // has text
      !isHiddenForEveryone(child) // Not hidden for anyone
  );
}
