import accessibleTextVirtual from './accessible-text-virtual';
import type { AccessibleTextContext } from './accessible-text-virtual';
import accessibleText from './accessible-text';
import findElmsInContext from '../dom/find-elms-in-context';
import { closest, nodeSorter } from '../../core/utils';

/**
 * Return accessible text for an implicit and/or explicit HTML label element
 * @param {VirtualNode} element
 * @param {Object} context
 * @property {Bool} inControlContext
 * @property {Bool} inLabelledByContext
 * @return {String} Label text
 */
function labelText(
  virtualNode: unknown,
  context: AccessibleTextContext = {}
): string {
  const { alreadyProcessed } = accessibleTextVirtual;
  if (
    context.inControlContext ||
    context.inLabelledByContext ||
    alreadyProcessed(virtualNode, context)
  ) {
    return '';
  }
  if (!context.startNode) {
    context.startNode = virtualNode;
  }

  const labelContext: AccessibleTextContext = {
    inControlContext: true,
    ...context
  };
  const explicitLabels = getExplicitLabels(virtualNode);
  const implicitLabel = closest(virtualNode as any, 'label');

  let labels: HTMLElement[];
  if (implicitLabel) {
    labels = [
      ...explicitLabels,
      (implicitLabel as any).actualNode as HTMLElement
    ];
    labels.sort(nodeSorter);
  } else {
    labels = explicitLabels;
  }

  return labels
    .map(label => accessibleText(label, labelContext))
    .filter(text => text !== '')
    .join(' ');
}

/**
 * Find a non-ARIA label for an element
 * @private
 * @param {VirtualNode} element The VirtualNode instance whose label we are seeking
 * @return {HTMLElement} The label element, or null if none is found
 */
function getExplicitLabels(virtualNode: unknown): HTMLElement[] {
  if (!(virtualNode as any).attr('id')) {
    return [];
  }

  if (!(virtualNode as any).actualNode) {
    throw new TypeError(
      'Cannot resolve explicit label reference for non-DOM nodes'
    );
  }

  return findElmsInContext({
    elm: 'label',
    attr: 'for',
    value: (virtualNode as any).attr('id'),
    context: (virtualNode as any).actualNode
  }) as HTMLElement[];
}

export default labelText;
