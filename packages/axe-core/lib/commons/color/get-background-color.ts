import incompleteData from './incomplete-data';
import getBackgroundStack from './get-background-stack';
import getOwnBackgroundColor from './get-own-background-color';
import elementHasImage from './element-has-image';
import Color from './color';
import flattenColors from './flatten-colors';
import flattenShadowColors from './flatten-shadow-colors';
import getTextShadowColors from './get-text-shadow-colors';
import getVisibleChildTextRects from '../dom/get-visible-child-text-rects';
import { getNodeFromTree } from '../../core/utils';
import { getStackingContext, stackingContextToColor } from './stacking-context';

interface BgColorEntry {
  color: Color;
  blendMode?: string | undefined;
}

/**
 * Returns background color for element
 * Uses getBackgroundStack() to get all elements rendered underneath the current element,
 * to help determine the composite background color.
 *
 * @method getBackgroundColor
 * @memberof axe.commons.color
 * @param  {Element} elm Element to determine background color
 * @param  {Array}   [bgElms=[]] elements to inspect
 * @param  {Number}  shadowOutlineEmMax Thickness of `text-shadow` at which it becomes a background color
 * @returns {Color}
 */
export default function getBackgroundColor(
  elm: Element,
  bgElms: Element[] = [],
  shadowOutlineEmMax: number = 0.1
): Color | null {
  const vNode = getNodeFromTree(elm) as any;
  const bgColorCache = vNode._cache.getBackgroundColor;

  if (bgColorCache) {
    bgElms.push(...bgColorCache.bgElms);
    incompleteData.set('bgColor', bgColorCache.incompleteData);
    return bgColorCache.bgColor;
  }

  const bgColor = _getBackgroundColor(elm, bgElms, shadowOutlineEmMax);

  vNode._cache.getBackgroundColor = {
    bgColor,
    bgElms,
    incompleteData: incompleteData.get('bgColor')
  };

  return bgColor;
}

function _getBackgroundColor(
  elm: Element,
  bgElms: Element[],
  shadowOutlineEmMax: number
): Color | null {
  const elmStack = getBackgroundStack(elm);
  if (!elmStack) {
    return null;
  }

  const textRects = getVisibleChildTextRects(elm);
  let bgColors: BgColorEntry[] =
    (getTextShadowColors(elm, {
      minRatio: shadowOutlineEmMax,
      ignoreEdgeCount: true
    }) as unknown as BgColorEntry[]) ?? []; // Empty object shouldn't be necessary. Just being safe.
  if (bgColors.length) {
    bgColors = [
      { color: (bgColors as unknown as Color[]).reduce(flattenShadowColors) }
    ];
  }

  // Search the stack until we have an alpha === 1 background
  for (let i = 0; i < elmStack.length; i++) {
    const bgElm = elmStack[i]!;
    const bgElmStyle = window.getComputedStyle(bgElm);

    if (elementHasImage(bgElm, bgElmStyle)) {
      bgElms.push(bgElm);

      return null;
    }

    // Get the background color
    let bgColor: Color;
    try {
      bgColor = getOwnBackgroundColor(bgElmStyle);
      if (bgColor.alpha === 0) {
        continue;
      }
    } catch (error) {
      if (error && incompleteData.get('colorParse')) {
        return null;
      }
      throw error;
    }

    // abort if a node is partially obscured and obscuring element has a background
    if (
      bgElmStyle.getPropertyValue('display') !== 'inline' &&
      !fullyEncompasses(bgElm, textRects)
    ) {
      bgElms.push(bgElm);
      incompleteData.set('bgColor', 'elmPartiallyObscured');

      return null;
    }

    // store elements contributing to the bg color.
    bgElms.push(bgElm);

    // Exit if the background is opaque
    if (bgColor.alpha === 1) {
      break;
    }
  }

  const stackingContext = getStackingContext(elm, elmStack);
  bgColors = stackingContext.map(stackingContextToColor).concat(bgColors);

  const pageBgs = getPageBackgroundColors(
    elm,
    elmStack.includes(document.body)
  );
  bgColors.unshift(...pageBgs);

  // default to white if bgColors is empty
  if (bgColors.length === 0) {
    return new Color(255, 255, 255, 1);
  }
  // Mix the colors together. Colors must be mixed in bottom up
  // order (background to foreground order) to produce the correct
  // result.
  // @see https://github.com/dequelabs/axe-core/issues/2924
  const blendedColor = (bgColors as (BgColorEntry | Color)[]).reduce(
    (
      bgColor: BgColorEntry | Color,
      fgColor: BgColorEntry | Color
    ): BgColorEntry | Color => {
      return flattenColors(
        (fgColor as BgColorEntry).color instanceof Color
          ? (fgColor as BgColorEntry).color
          : (fgColor as Color),
        (bgColor as BgColorEntry).color instanceof Color
          ? (bgColor as BgColorEntry).color
          : (bgColor as Color),
        (fgColor as BgColorEntry).blendMode
      );
    }
  );

  // default page background is white which must be mixed last
  // @see https://www.w3.org/TR/compositing-1/#pagebackdrop
  return flattenColors(
    (blendedColor as BgColorEntry).color instanceof Color
      ? (blendedColor as BgColorEntry).color
      : (blendedColor as Color),
    new Color(255, 255, 255, 1)
  );
}

/**
 * Checks whether a node fully encompasses a set of rects.
 * @private
 * @param {Element} node
 * @param {NodeRect[]} rects
 * @return {Boolean}
 */
function fullyEncompasses(node: Element, rects: DOMRect | DOMRect[]): boolean {
  const rectsArray: DOMRect[] = Array.isArray(rects) ? rects : [rects];

  const nodeRect = node.getBoundingClientRect();
  let { right, bottom } = nodeRect;
  const style = window.getComputedStyle(node);
  const overflow = style.getPropertyValue('overflow');
  const paddingLeft = parseInt(style.getPropertyValue('padding-left'), 10);
  const paddingRight = parseInt(style.getPropertyValue('padding-right'), 10);
  const paddingTop = parseInt(style.getPropertyValue('padding-top'), 10);
  const paddingBottom = parseInt(style.getPropertyValue('padding-bottom'), 10);

  if (
    ['scroll', 'auto'].includes(overflow) ||
    node instanceof window.HTMLHtmlElement
  ) {
    right =
      nodeRect.left +
      (node as HTMLElement).scrollWidth +
      paddingLeft +
      paddingRight;
    bottom =
      nodeRect.top +
      (node as HTMLElement).scrollHeight +
      paddingTop +
      paddingBottom;
  }

  return rectsArray.every(rect => {
    return (
      rect.top >= nodeRect.top &&
      rect.bottom <= bottom &&
      rect.left >= nodeRect.left &&
      rect.right <= right
    );
  });
}

function normalizeBlendMode(blendmode: string | undefined): string | undefined {
  return !!blendmode ? blendmode : undefined;
}

/**
 * Get the page background color.
 * @private
 * @param {Element} elm
 * @param {Boolean} stackContainsBody
 * @return {Colors[]}
 */
function getPageBackgroundColors(
  elm: Element,
  stackContainsBody: boolean
): BgColorEntry[] {
  const pageColors: BgColorEntry[] = [];

  // Body can sometimes appear out of order in the stack:
  //   1) Body is not the first element due to negative z-index elements
  //   2) Elements are positioned outside of body's rect coordinates
  //      (see https://github.com/dequelabs/axe-core/issues/1456)
  // In those instances we need to determine if we should use the
  // body background or the html background color
  if (!stackContainsBody) {
    // if the html element defines a bgColor and body defines a
    // bgColor but body's height is not the full viewport, then the
    // html bgColor fills the full viewport and body bgColor only
    // fills to its size. however, if the html element does not
    // define a bgColor, then the body bgColor fills the full
    // viewport. so if the body wasn't added to the elmStack, we
    // need to know which bgColor to get (html or body)
    const html = document.documentElement;
    const body = document.body;
    const htmlStyle = window.getComputedStyle(html);
    const bodyStyle = window.getComputedStyle(body);
    const htmlBgColor = getOwnBackgroundColor(htmlStyle);
    const bodyBgColor = getOwnBackgroundColor(bodyStyle);
    const bodyBgColorApplies =
      bodyBgColor.alpha !== 0 &&
      fullyEncompasses(body, elm.getBoundingClientRect());
    if (
      (bodyBgColor.alpha !== 0 && htmlBgColor.alpha === 0) ||
      (bodyBgColorApplies && bodyBgColor.alpha !== 1)
    ) {
      pageColors.unshift({
        color: bodyBgColor,
        blendMode: normalizeBlendMode(
          bodyStyle.getPropertyValue('mix-blend-mode')
        )
      });
    }

    if (
      htmlBgColor.alpha !== 0 &&
      (!bodyBgColorApplies || (bodyBgColorApplies && bodyBgColor.alpha !== 1))
    ) {
      pageColors.unshift({
        color: htmlBgColor,
        blendMode: normalizeBlendMode(
          htmlStyle.getPropertyValue('mix-blend-mode')
        )
      });
    }
  }

  return pageColors;
}
