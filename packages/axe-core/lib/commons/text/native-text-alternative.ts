import getRole from '../aria/get-role';
import getElementSpec from '../standards/get-element-spec';
import nativeTextMethods from './native-text-methods';
import type { AccessibleTextContext } from './accessible-text-virtual';

/**
 * Get the accessible text using native HTML methods only
 * @param {VirtualNode} element
 * @param {Object} context
 * @property {Bool} debug Enable logging for formControlValue
 * @return {String} Accessible text
 */
export default function nativeTextAlternative(
  virtualNode: unknown,
  context: AccessibleTextContext = {}
): string {
  const { actualNode } = virtualNode as any;
  if (
    (virtualNode as any).props.nodeType !== 1 ||
    ['presentation', 'none'].includes(getRole(virtualNode)!)
  ) {
    return '';
  }

  const textMethods = findTextMethods(virtualNode);
  // Find the first step that returns a non-empty string
  const accessibleName = textMethods.reduce((accName: string, step) => {
    return accName || step(virtualNode, context);
  }, '');

  if (context.debug) {
    (axe as any).log(accessibleName || '{empty-value}', actualNode, context);
  }
  return accessibleName;
}

/**
 * Get accessible text functions for a specific native HTML element
 * @private
 * @param {VirtualNode} element
 * @return {Function[]} Array of native accessible name computation methods
 */
function findTextMethods(
  virtualNode: unknown
): Array<(vNode: unknown, ctx?: unknown) => string> {
  const elmSpec = getElementSpec(virtualNode as any, {
    noMatchAccessibleName: true
  });
  const methods: string[] = (elmSpec as any).namingMethods || [];

  return methods
    .map((methodName: string) => nativeTextMethods[methodName])
    .filter((m): m is (vNode: unknown, ctx?: unknown) => string => !!m);
}
