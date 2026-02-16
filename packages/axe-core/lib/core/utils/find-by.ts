/**
 * Iterates an array of objects looking for a property with a specific value
 * @method findBy
 * @memberof axe.utils
 * @param  {Array} array  The array of objects to iterate
 * @param  {String} key   The property name to test against
 * @param  {Mixed} value  The value to find
 * @return {Object}       The first matching object or `undefined` if no match
 */
function findBy(
  array: unknown,
  key: string,
  value: unknown
): Record<string, unknown> | undefined {
  if (Array.isArray(array)) {
    return array.find(
      (obj: unknown) =>
        obj !== null &&
        typeof obj === 'object' &&
        Object.hasOwn(obj as Record<string, unknown>, key) &&
        (obj as Record<string, unknown>)[key] === value
    );
  }
}

export default findBy;
