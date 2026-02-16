import toGrid from './to-grid';
import getCellPosition from './get-cell-position';
import findUp from '../dom/find-up';
import { nodeLookup } from '../../core/utils';
import getExplicitRole from '../aria/get-explicit-role';

/** Shape of vNode returned by nodeLookup */
interface VNodeLike {
  attr(name: string): string | null;
  props: { nodeName: string };
  actualNode: Node | null;
}

/**
 * Determine if a `HTMLTableCellElement` is a column header, if so get the scope of the header
 * @method getScope
 * @memberof axe.commons.table
 * @instance
 * @param {HTMLTableCellElement|AbstractVirtualNode} cell The table cell to test
 * @return {Boolean|String} Returns `false` if not a column header, or the scope of the column header element
 */
export default function getScope(el: unknown): 'col' | 'row' | 'auto' | false {
  const { vNode: rawVNode, domNode: cell } = nodeLookup(el);
  const vNode = rawVNode as VNodeLike;

  const scope = vNode.attr('scope');
  const role = getExplicitRole(rawVNode);

  if (!['td', 'th'].includes(vNode.props.nodeName)) {
    throw new TypeError('Expected TD or TH element');
  }

  if (role === 'columnheader') {
    return 'col';
  } else if (role === 'rowheader') {
    return 'row';
  } else if (scope === 'col' || scope === 'row') {
    return scope;
  } else if (vNode.props.nodeName !== 'th') {
    return false;
  } else if (!vNode.actualNode) {
    return 'auto';
  }
  const tableGrid = toGrid(
    findUp(cell as HTMLTableCellElement, 'table') as HTMLTableElement
  ) as HTMLTableCellElement[][];
  const pos = getCellPosition(cell as HTMLTableCellElement, tableGrid);

  // The element is in a row with all th elements, that makes it a column header
  const headerRow = tableGrid[pos!.y]!.every(
    (node: HTMLTableCellElement) => node.nodeName.toUpperCase() === 'TH'
  );

  if (headerRow) {
    return 'col';
  }

  // The element is in a column with all th elements, that makes it a row header
  const headerCol = tableGrid
    .map((col: HTMLTableCellElement[]) => col[pos!.x])
    .every(
      (node: HTMLTableCellElement | undefined) =>
        node && node.nodeName.toUpperCase() === 'TH'
    );

  if (headerCol) {
    return 'row';
  }
  return 'auto';
}
