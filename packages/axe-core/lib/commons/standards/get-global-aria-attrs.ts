import cache from '../../core/base/cache';
import standards from '../../standards';

/**
 * Return a list of global aria attributes.
 * @returns List of all global aria attributes
 */
function getGlobalAriaAttrs(): string[] {
  return cache.get('globalAriaAttrs', () =>
    Object.keys(standards.ariaAttrs).filter(attrName => {
      return standards.ariaAttrs[attrName]?.global;
    })
  ) as string[];
}

export default getGlobalAriaAttrs;
