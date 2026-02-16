import { validateAttrValue } from '../../commons/aria';
import standards from '../../standards';

declare const axe: any;

/**
 * Check that each ARIA attribute on an element has a valid value.
 *
 * Valid ARIA attribute values are taken from the `ariaAttrs` standards object from an attributes `type` property.
 *
 * @memberof checks
 * @return {Mixed} True if all ARIA attributes have a valid value. Undefined for invalid `aria-current` or `aria-describedby` values. False otherwise.
 */
export default function ariaValidAttrValueEvaluate(
  this: any,
  node: HTMLElement,
  options: any,
  virtualNode: any
): boolean | undefined {
  options = Array.isArray(options.value) ? options.value : [];

  let needsReview = '';
  let messageKey = '';
  const invalid: string[] = [];
  const aria = /^aria-/;
  const skipAttrs = ['aria-errormessage'];

  const preChecks: Record<
    string,
    (validValue: boolean) => boolean | undefined | void
  > = {
    // aria-controls should only check if element exists if the element
    // doesn't have aria-expanded=false, aria-selected=false (tabs),
    // or aria-haspopup (may load later)
    'aria-controls': () => {
      const hasPopup =
        ['false', null].includes(virtualNode.attr('aria-haspopup')) === false;

      if (hasPopup) {
        needsReview = `aria-controls="${virtualNode.attr('aria-controls')}"`;
        messageKey = 'controlsWithinPopup';
      }

      return (
        virtualNode.attr('aria-expanded') !== 'false' &&
        virtualNode.attr('aria-selected') !== 'false' &&
        hasPopup === false
      );
    },
    // aria-current should mark as needs review if any value is used that is
    // not one of the valid values (since any value is treated as "true")
    'aria-current': (validValue: boolean) => {
      if (!validValue) {
        needsReview = `aria-current="${virtualNode.attr('aria-current')}"`;
        messageKey = 'ariaCurrent';
      }

      return;
    },
    // aria-owns should only check if element exists if the element
    // doesn't have aria-expanded=false (combobox)
    'aria-owns': () => {
      return virtualNode.attr('aria-expanded') !== 'false';
    },
    // aria-describedby should not mark missing element as violation but
    // instead as needs review
    'aria-describedby': (validValue: boolean) => {
      if (!validValue) {
        needsReview = `aria-describedby="${virtualNode.attr(
          'aria-describedby'
        )}"`;
        // TODO: es-modules_tree
        messageKey =
          axe._tree && axe._tree[0]._hasShadowRoot ? 'noIdShadow' : 'noId';
      }

      return;
    },
    // aria-labelledby should not mark missing element as violation but
    // instead as needs review
    'aria-labelledby': (validValue: boolean) => {
      if (!validValue) {
        needsReview = `aria-labelledby="${virtualNode.attr(
          'aria-labelledby'
        )}"`;
        // TODO: es-modules_tree
        messageKey =
          axe._tree && axe._tree[0]._hasShadowRoot ? 'noIdShadow' : 'noId';
      }
    }
  };

  virtualNode.attrNames.forEach((attrName: string) => {
    if (
      skipAttrs.includes(attrName) ||
      options.includes(attrName) ||
      !aria.test(attrName)
    ) {
      return;
    }

    let validValue: any;
    const attrValue = virtualNode.attr(attrName);

    try {
      validValue = validateAttrValue(virtualNode, attrName);
    } catch {
      needsReview = `${attrName}="${attrValue}"`;
      messageKey = 'idrefs';
      return;
    }

    if (
      (preChecks[attrName] ? preChecks[attrName](validValue) : true) &&
      !validValue
    ) {
      if (attrValue === '' && !isStringType(attrName)) {
        needsReview = attrName;
        messageKey = 'empty';
      } else {
        invalid.push(`${attrName}="${attrValue}"`);
      }
    }
  });

  if (invalid.length) {
    this.data(invalid);
    return false;
  }

  if (needsReview) {
    this.data({ messageKey, needsReview });
    return undefined;
  }

  return true;
}

function isStringType(attrName: string): boolean {
  return standards.ariaAttrs[attrName]?.type === 'string';
}
