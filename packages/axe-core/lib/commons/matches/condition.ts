/**
 * Check if a "thing" is truthy according to a "condition"
 *
 * Note: matches.condition(node, matcher) can be indirectly used through
 * matches(node, { condition: matcher })
 *
 * Example:
 * ```js
 * matches.condition(node, (arg) => arg === null)
 * ```
 *
 * @param arg - The value to check
 * @param matcher - A function that evaluates the value
 * @returns true if the matcher returns a truthy value
 */
export default function condition(
  arg: unknown,
  matcher: (value: unknown) => unknown
): boolean {
  return !!matcher(arg);
}
