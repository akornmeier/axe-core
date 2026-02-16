/**
 * Converts array-like (numerical indicies and `length` property) structures to actual, real arrays
 * @param	{Mixed} thing Array-like thing to convert
 * @return {Array}
 */
function toArray<T = unknown>(thing: ArrayLike<T>): T[] {
  return Array.prototype.slice.call(thing);
}

export default toArray;
