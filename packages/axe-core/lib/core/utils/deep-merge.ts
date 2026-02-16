/**
 * Deeply merge two objects into a new object without changing any of the source objects.
 * @see https://medium.com/javascript-in-plain-english/how-to-merge-objects-in-javascript-98f2209710e3
 * @param {...Object} sources
 * @return {Object}
 */
function deepMerge(
  ...sources: Array<Record<string, unknown> | unknown>
): Record<string, unknown> {
  const target: Record<string, unknown> = {};

  sources.forEach(source => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return;
    }

    for (const key of Object.keys(source as Record<string, unknown>)) {
      if (
        !target.hasOwnProperty(key) ||
        typeof (source as Record<string, unknown>)[key] !== 'object' ||
        Array.isArray(target[key])
      ) {
        target[key] = (source as Record<string, unknown>)[key];
      } else {
        target[key] = deepMerge(
          target[key] as Record<string, unknown>,
          (source as Record<string, unknown>)[key] as Record<string, unknown>
        );
      }
    }
  });

  return target;
}

export default deepMerge;
