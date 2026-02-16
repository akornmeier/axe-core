/**
 * Namespace for matching utilities.
 * @namespace commons.matches
 * @memberof axe
 */
import hasAccessibleName from './has-accessible-name';
import attributes from './attributes';
import condition from './condition';
import explicitRole from './explicit-role';
import fromDefinition from './from-definition';
import fromFunction from './from-function';
import fromPrimative from './from-primative';
import implicitRole from './implicit-role';
import matches from './matches';
import nodeName from './node-name';
import properties from './properties';
import semanticRole from './semantic-role';

/**
 * Extended matches function with all matcher utilities attached
 */
interface MatchesWithUtils {
  (vNode: unknown, definition: unknown): boolean;
  hasAccessibleName: typeof hasAccessibleName;
  attributes: typeof attributes;
  condition: typeof condition;
  explicitRole: typeof explicitRole;
  fromDefinition: typeof fromDefinition;
  fromFunction: typeof fromFunction;
  fromPrimative: typeof fromPrimative;
  implicitRole: typeof implicitRole;
  nodeName: typeof nodeName;
  properties: typeof properties;
  semanticRole: typeof semanticRole;
}

const matchesWithUtils = matches as MatchesWithUtils;

matchesWithUtils.hasAccessibleName = hasAccessibleName;
matchesWithUtils.attributes = attributes;
matchesWithUtils.condition = condition;
matchesWithUtils.explicitRole = explicitRole;
matchesWithUtils.fromDefinition = fromDefinition;
matchesWithUtils.fromFunction = fromFunction;
matchesWithUtils.fromPrimative = fromPrimative;
matchesWithUtils.implicitRole = implicitRole;
matchesWithUtils.nodeName = nodeName;
matchesWithUtils.properties = properties;
matchesWithUtils.semanticRole = semanticRole;

export default matchesWithUtils;
