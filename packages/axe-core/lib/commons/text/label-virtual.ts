import ariaLabelVirtual from '../aria/label-virtual';
import visible from './visible';
import visibleVirtual from './visible-virtual';
import getRootNode from '../dom/get-root-node';
import { closest, escapeSelector } from '../../core/utils';

/**
 * Gets the visible text of a label for a given input
 * @see http://www.w3.org/WAI/PF/aria/roles#namecalculation
 * @method labelVirtual
 * @memberof axe.commons.text
 * @instance
 * @param  {VirtualNode} node The virtual node mapping to the input to test
 * @return {Mixed} String of visible text, or `null` if no label is found
 */
function labelVirtual(virtualNode: unknown): string | null {
  let ref: HTMLLabelElement | null | undefined,
    candidate: string | null,
    doc: Document | DocumentFragment;

  candidate = ariaLabelVirtual(virtualNode);
  if (candidate) {
    return candidate;
  }

  // explicit label
  if ((virtualNode as any).attr('id')) {
    if (!(virtualNode as any).actualNode) {
      throw new TypeError(
        'Cannot resolve explicit label reference for non-DOM nodes'
      );
    }

    const id = escapeSelector((virtualNode as any).attr('id'));
    doc = getRootNode((virtualNode as any).actualNode);
    ref = doc.querySelector(
      'label[for="' + id + '"]'
    ) as HTMLLabelElement | null;
    candidate = ref && visible(ref, true);
    if (candidate) {
      return candidate;
    }
  }

  ref = closest(virtualNode as any, 'label') as HTMLLabelElement | null;
  candidate = ref ? visibleVirtual(ref, true) : null;
  if (candidate) {
    return candidate;
  }

  return null;
}

export default labelVirtual;
