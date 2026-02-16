import standards from '../../standards';

/**
 * Return a list of html elements whose content type matches the provided value.
 * Note: this will not work for 'interactive' content types as those depend on the element.
 * @param type - The desired content type
 * @returns List of all elements matching the type
 */
function getElementsByContentType(type: string): string[] {
  return Object.keys(standards.htmlElms).filter(nodeName => {
    const elm = standards.htmlElms[nodeName];

    if (!elm) {
      return false;
    }

    if (elm.contentTypes) {
      return (elm.contentTypes as string[]).includes(type);
    }

    // some elements do not have content types
    if (!elm.variant) {
      return false;
    }

    if (elm.variant.default && elm.variant.default.contentTypes) {
      return (elm.variant.default.contentTypes as string[]).includes(type);
    }

    // content type depends on a virtual node
    return false;
  });
}

export default getElementsByContentType;
