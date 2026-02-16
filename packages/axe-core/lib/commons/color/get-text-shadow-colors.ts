import Color from './color';
import assert from '../../core/utils/assert';
import getStrokeColorsFromShadows from './get-stroke-colors-from-shadows';
import parseTextShadows from './parse-text-shadows';

interface TextShadowOptions {
  minRatio?: number;
  maxRatio?: number;
  ignoreEdgeCount?: boolean | undefined;
}

/**
 * Get text-shadow colors that can impact the color contrast of the text, including from:
 * - Shadows which are individually thick enough (minRatio <= thickness <= maxRatio) to distinguish as characters
 * - Groups of "thin" shadows (thickness < minRatio) that collectively act as a pseudo-text-stroke (see #4064)
 * @param {Element} node  DOM Element
 * @param {Object} options (optional)
 * @property {Bool} minRatio Treat shadows smaller than this as "thin", ratio shadow size divided by font size
 * @property {Bool} maxRatio Ignore shadows equal or larger than this, ratio shadow size divided by font size
 * @property {Bool} ignoreEdgeCount Do not return null when if shadows cover 2 or 3 edges, ignore those instead
 * @returns {Array|null} Array of colors or null if text-shadow was too complex to measure
 */
export default function getTextShadowColors(
  node: Element,
  { minRatio, maxRatio, ignoreEdgeCount }: TextShadowOptions = {}
): Color[] | null {
  const shadowColors: Color[] = [];
  const style = window.getComputedStyle(node);
  const textShadow = style.getPropertyValue('text-shadow');
  if (textShadow === 'none') {
    return shadowColors;
  }

  const fontSizeStr = style.getPropertyValue('font-size');
  const fontSize = parseInt(fontSizeStr);
  assert(
    isNaN(fontSize) === false,
    `Unable to determine font-size value ${fontSizeStr}`
  );

  const thinShadows: Array<{ colorStr: string; pixels: number[] }> = [];
  const shadows = parseTextShadows(textShadow);
  for (const shadow of shadows) {
    // Defaults only necessary for IE
    const colorStr = shadow.colorStr || style.getPropertyValue('color');
    const offsetX: number = shadow.pixels[0] ?? 0;
    const offsetY: number = shadow.pixels[1] ?? 0;
    const blurRadius: number = shadow.pixels[2] ?? 0;
    if (maxRatio && blurRadius >= fontSize * maxRatio) {
      continue;
    }
    if (minRatio && blurRadius < fontSize * minRatio) {
      thinShadows.push({ colorStr, pixels: shadow.pixels });
      continue;
    }
    if (thinShadows.length > 0) {
      // Inset any stroke colors before this shadow
      const strokeColors = getStrokeColorsFromShadows(thinShadows, {
        ignoreEdgeCount
      });
      if (strokeColors === null) {
        return null; // Exit early if text-shadow is too complex
      }
      shadowColors.push(...strokeColors);
      thinShadows.splice(0, thinShadows.length); // empty
    }

    const color = textShadowColor({
      colorStr,
      offsetX,
      offsetY,
      blurRadius,
      fontSize
    });
    shadowColors.push(color);
  }

  if (thinShadows.length > 0) {
    // Append any remaining stroke colors
    const strokeColors = getStrokeColorsFromShadows(thinShadows, {
      ignoreEdgeCount
    });
    if (strokeColors === null) {
      return null; // Exit early if text-shadow is too complex
    }
    shadowColors.push(...strokeColors);
  }

  return shadowColors;
}

interface TextShadowColorParams {
  colorStr: string;
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  fontSize: number;
}

function textShadowColor({
  colorStr,
  offsetX,
  offsetY,
  blurRadius,
  fontSize
}: TextShadowColorParams): Color {
  if (offsetX > blurRadius || offsetY > blurRadius) {
    // Shadow is too far removed from the text to impact contrast
    return new Color(0, 0, 0, 0);
  }

  const shadowColor = new Color();
  shadowColor.parseString(colorStr);
  shadowColor.alpha *= blurRadiusToAlpha(blurRadius, fontSize);

  return shadowColor;
}

function blurRadiusToAlpha(blurRadius: number, fontSize: number): number {
  if (blurRadius === 0) {
    return 1;
  }

  // This formula is an estimate based on various tests.
  // Different people test this differently, so opinions may vary.
  const relativeBlur = blurRadius / fontSize;
  return 0.185 / (relativeBlur + 0.4);
}
