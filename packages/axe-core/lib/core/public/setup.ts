import { getFlattenedTree, getSelectorData } from '../utils';
import { setupGlobals } from './run/globals-setup';

declare const axe: {
  _tree: unknown[] | undefined;
  _selectorData: unknown;
};

/**
 * Setup axe-core so axe.common functions can work properly.
 * @param node optional node. NOTE: passing in anything other than body or the documentElement may result in incomplete results.
 */
function setup(node?: Node | Document): unknown {
  if (axe._tree) {
    throw new Error(
      'Axe is already setup. Call `axe.teardown()` before calling `axe.setup` again.'
    );
  }
  // Normalize document
  let targetNode: Node | undefined = node as Node | undefined;
  if (
    targetNode &&
    typeof (targetNode as Document).documentElement === 'object' &&
    typeof (targetNode as Document).defaultView === 'object'
  ) {
    targetNode = (targetNode as Document).documentElement;
  }

  setupGlobals(targetNode);
  axe._tree = getFlattenedTree(targetNode as Node);
  axe._selectorData = getSelectorData(axe._tree);

  return axe._tree[0];
}

export default setup;
