/**
 * Represents a virtual DOM node used throughout axe-core.
 */
interface VirtualNode {
  parent: VirtualNode | null | undefined;
  props: {
    nodeName: string;
    nodeType: number;
  };
  _isDisabled?: boolean;
  attr(name: string): string | null;
  hasAttr(name: string): boolean;
}

const disabledNodeNames: readonly string[] = [
  'fieldset',
  'button',
  'select',
  'input',
  'textarea'
];

/**
 * Determines if an element disabled, or part of a disabled element
 *
 * IMPORTANT: This method is fairly loose. There are significant differences in browsers of when
 * they'll announce a thing disabled. This tells us if any accessibility supported browser
 * identifies an element as disabled, but not if all of them do.
 *
 * @method isDisabled
 * @memberof axe.commons.forms
 * @param virtualNode The virtual node to check
 * @returns whether or not the element is disabled in some way
 */
function isDisabled(virtualNode: VirtualNode): boolean {
  let disabledState = virtualNode._isDisabled;
  if (typeof disabledState === 'boolean') {
    return disabledState; // From cache
  }

  const { nodeName } = virtualNode.props;
  const ariaDisabled = virtualNode.attr('aria-disabled');
  if (disabledNodeNames.includes(nodeName) && virtualNode.hasAttr('disabled')) {
    disabledState = true; // Native
  } else if (ariaDisabled) {
    // ARIA
    disabledState = ariaDisabled.toLowerCase() === 'true';
  } else if (virtualNode.parent) {
    // Inherited
    disabledState = isDisabled(virtualNode.parent as VirtualNode);
  } else {
    // Default
    disabledState = false;
  }

  virtualNode._isDisabled = disabledState;
  return disabledState;
}

export default isDisabled;
