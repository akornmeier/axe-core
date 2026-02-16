/**
 * Check if the DOMPoint is within the DOMRect
 * @method isPointInRect
 * @memberof axe.commons.math
 * @param {DOMPoint}
 * @param {DOMRect}
 * @returns {boolean}
 */
export function isPointInRect(
  { x, y }: { x: number; y: number },
  {
    top,
    right,
    bottom,
    left
  }: { top: number; right: number; bottom: number; left: number }
): boolean {
  return y >= top && x <= right && y <= bottom && x >= left;
}
