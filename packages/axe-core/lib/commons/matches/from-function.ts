import fromPrimative from './from-primative';
import type { PrimitiveMatcher } from './from-primative';

/**
 * Matcher object: maps property names to primitive matchers
 */
export interface FunctionMatcher {
  [propName: string]: PrimitiveMatcher;
}

/**
 * Check if the value from a function matches some condition
 *
 * Each key on the matcher object is passed to getValue, the returned value must match
 * with the value of that matcher
 *
 * Example:
 * ```js
 * matches.fromFunction(
 *   (attr => node.getAttribute(attr),
 *   {
 *     'aria-hidden': /^true|false$/i
 *   }
 * )
 * ```
 *
 * @private
 * @param getValue - Function to get a value by property name
 * @param matcher - Object mapping property names to matchers
 * @returns true if all properties match
 */
function fromFunction(
  getValue: (propName: string) => unknown,
  matcher: FunctionMatcher
): boolean {
  const matcherType = typeof matcher;
  if (
    matcherType !== 'object' ||
    Array.isArray(matcher) ||
    matcher instanceof RegExp
  ) {
    throw new Error('Expect matcher to be an object');
  }

  // Check that the property has all the expected values
  return Object.keys(matcher).every(propName => {
    return fromPrimative(
      getValue(propName) as string | boolean | number | null | undefined,
      matcher[propName]
    );
  });
}

export default fromFunction;
