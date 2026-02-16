import { labelVirtual, accessibleText, sanitize } from '../../commons/text';
import { idrefs } from '../../commons/dom';

function helpSameAsLabelEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const labelTextVal = labelVirtual(virtualNode);
  let check = node.getAttribute('title');

  if (!labelTextVal) {
    return false;
  }

  if (!check) {
    check = '';

    if (node.getAttribute('aria-describedby')) {
      const ref = idrefs(node, 'aria-describedby');
      check = ref
        .map((thing: any) => {
          return thing ? accessibleText(thing) : '';
        })
        .join('');
    }
  }

  return sanitize(check) === sanitize(labelTextVal);
}

export default helpSameAsLabelEvaluate;
