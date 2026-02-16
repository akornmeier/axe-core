/**
 * Primitive matcher type: can be a string, RegExp, function, array of strings, null, or undefined
 */
export type PrimitiveMatcher =
  | string
  | RegExp
  | ((value: unknown) => boolean)
  | string[]
  | boolean
  | null
  | undefined;

/**
 * Primitive value type: values that can be matched against
 */
export type PrimitiveValue = string | boolean | number | null | undefined;

/**
 * Check if some value matches
 *
 * ```js
 * match.fromPrimative('foo', 'foo') // true, string is the same
 * match.fromPrimative('foo', ['foo', 'bar']) // true, string is included
 * match.fromPrimative('foo', /foo/) // true, string matches regex
 * match.fromPrimative('foo', str => str.toUpperCase() === 'FOO') // true, function return is truthy
 * match.fromPrimative('foo', '/foo/') // true, string matches regex string
 * ```
 *
 * @private
 * @param someString - The value to check
 * @param matcher - The matcher to check against
 * @returns true if the value matches
 */
function fromPrimative(
  someString: PrimitiveValue,
  matcher: PrimitiveMatcher
): boolean {
  const matcherType = typeof matcher;
  if (Array.isArray(matcher) && typeof someString !== 'undefined') {
    return matcher.includes(someString as string);
  }

  if (matcherType === 'function') {
    return !!(matcher as (value: unknown) => boolean)(someString);
  }

  // RegExp.test(str) typecasts the str to a String value so doing
  // `/.*/.test(null)` returns true as null is cast to "null"
  if (someString !== null && someString !== undefined) {
    if (matcher instanceof RegExp) {
      return matcher.test(String(someString));
    }

    // matcher starts and ends with "/"
    if (typeof matcher === 'string' && /^\/.*\/$/.test(matcher)) {
      const pattern = matcher.substring(1, matcher.length - 1);
      return new RegExp(pattern).test(String(someString));
    }
  }

  return matcher === someString;
}

export default fromPrimative;
