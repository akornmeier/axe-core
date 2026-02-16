import flattenColors from './flatten-colors';
import Color from './color';

/**
 * Get the contrast of two colors
 * @method getContrast
 * @memberof axe.commons.color.Color
 * @instance
 * @param  {Color}  bgcolor  Background color
 * @param  {Color}  fgcolor  Foreground color
 * @return {number} The contrast ratio
 */
function getContrast(
  bgColor: Color | null,
  fgColor: Color | null
): number | null {
  if (!fgColor || !bgColor) {
    return null;
  }

  if (fgColor.alpha < 1) {
    fgColor = flattenColors(fgColor, bgColor);
  }

  const bL = bgColor.getRelativeLuminance();
  const fL = fgColor.getRelativeLuminance();

  return (Math.max(fL, bL) + 0.05) / (Math.min(fL, bL) + 0.05);
}

export default getContrast;
