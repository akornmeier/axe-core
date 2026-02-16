import hasAccessibleName from './has-accessible-name';
import attributes from './attributes';
import condition from './condition';
import explicitRole from './explicit-role';
import implicitRole from './implicit-role';
import nodeName from './node-name';
import properties from './properties';
import semanticRole from './semantic-role';
import { nodeLookup, matches } from '../../core/utils';
import type { PrimitiveMatcher } from './from-primative';
import type { FunctionMatcher } from './from-function';

/**
 * A single match definition object mapping matcher names to their values
 */
export interface MatchDefinitionObject {
  hasAccessibleName?: PrimitiveMatcher;
  attributes?: FunctionMatcher;
  condition?: (value: unknown) => unknown;
  explicitRole?: PrimitiveMatcher;
  implicitRole?: PrimitiveMatcher;
  nodeName?: PrimitiveMatcher;
  properties?: FunctionMatcher;
  semanticRole?: PrimitiveMatcher;
  [key: string]: unknown;
}

/**
 * A match definition can be a string, object, or array of definitions
 */
export type MatchDefinition =
  | string
  | MatchDefinitionObject
  | MatchDefinition[];

type MatcherFunction = (vNode: unknown, matcher: never) => boolean;

const matchers: Record<string, MatcherFunction> = {
  hasAccessibleName: hasAccessibleName as MatcherFunction,
  attributes: attributes as MatcherFunction,
  condition: condition as MatcherFunction,
  explicitRole: explicitRole as MatcherFunction,
  implicitRole: implicitRole as MatcherFunction,
  nodeName: nodeName as MatcherFunction,
  properties: properties as MatcherFunction,
  semanticRole: semanticRole as MatcherFunction
};

/**
 * Check if a virtual node matches some definition
 *
 * Note: matches.fromDefinition(vNode, definition) can be indirectly used through
 * matches(vNode, definition)
 *
 * Example:
 * ```js
 * matches.fromDefinition(vNode, {
 *   nodeName: ['div', 'span']
 *   attributes: {
 *     'aria-live': 'assertive'
 *   }
 * })
 * ```
 *
 * @deprecated HTMLElement is deprecated, use VirtualNode instead
 *
 * @private
 * @param vNode - The virtual node or HTML element to check
 * @param definition - The definition to match against
 * @returns true if the virtual node matches the definition
 */
function fromDefinition(vNode: unknown, definition: MatchDefinition): boolean {
  vNode = nodeLookup(vNode).vNode;

  if (Array.isArray(definition)) {
    return definition.some(definitionItem =>
      fromDefinition(vNode, definitionItem)
    );
  }
  if (typeof definition === 'string') {
    return matches(vNode, definition);
  }

  return Object.keys(definition).every(matcherName => {
    if (!matchers[matcherName]) {
      throw new Error(`Unknown matcher type "${matcherName}"`);
    }
    // Find the specific matches method to.
    // matches.attributes, matches.nodeName, matches.properties, etc.
    const matchMethod = matchers[matcherName];

    // Find the matcher that goes into the matches method.
    // 'div', /^div$/, (str) => str === 'div', etc.
    const matcher = (definition as MatchDefinitionObject)[matcherName];
    return matchMethod(vNode, matcher as never);
  });
}

export default fromDefinition;
