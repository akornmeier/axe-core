import getExplicitRole from '../commons/aria/get-explicit-role';
import isComboboxPopup from '../commons/aria/is-combobox-popup';
import getElementSpec from '../commons/standards/get-element-spec';
import querySelectorAll from '../core/utils/query-selector-all';
import AbstractVirtualNode from '../core/base/virtual-node/abstract-virtual-node';

/**
 * Filter out elements that have a naming method (i.e. img[alt], table > caption, etc.)
 */
function noNamingMethodMatches(
  node: HTMLElement,
  virtualNode: AbstractVirtualNode
): boolean {
  const { namingMethods } = getElementSpec(virtualNode) as any;
  if (namingMethods && namingMethods.length !== 0) {
    return false;
  }
  // Additionally, ignore combobox that get their name from a descendant input:
  if (
    getExplicitRole(virtualNode) === 'combobox' &&
    querySelectorAll(virtualNode, 'input:not([type="hidden"])').length
  ) {
    return false;
  }
  // Ignore listboxes that are referenced by a combobox
  // Other roles don't require a name at all, or require one anyway
  if (isComboboxPopup(virtualNode, { popupRoles: ['listbox'] })) {
    return false;
  }
  return true;
}

export default noNamingMethodMatches;
