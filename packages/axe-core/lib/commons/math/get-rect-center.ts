/**
 * Return the center point of a rect
 * @method getRectCenter
 * @memberof axe.commons.math
 * @param {DOMRect}
 * @returns {DOMPoint}
 */
export function getRectCenter({
  left,
  top,
  width,
  height
}: {
  left: number;
  top: number;
  width: number;
  height: number;
}): DOMPoint {
  return new window.DOMPoint(left + width / 2, top + height / 2);
}
