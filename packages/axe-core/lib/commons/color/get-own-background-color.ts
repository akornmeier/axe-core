import Color from './color';

/**
 * Returns the non-alpha-blended background color of an element
 *
 * @method getOwnBackgroundColor
 * @memberof axe.commons.color
 *
 * @param {Object} elmStyle style of the element
 * @return {Color}
 */
function getOwnBackgroundColor(elmStyle: CSSStyleDeclaration): Color {
  const bgColor = new Color();
  bgColor.parseString(elmStyle.getPropertyValue('background-color'));

  if (bgColor.alpha !== 0) {
    const opacity = elmStyle.getPropertyValue('opacity');
    bgColor.alpha = bgColor.alpha * parseFloat(opacity);
  }

  return bgColor;
}

export default getOwnBackgroundColor;
