import toGrid from './to-grid';
import findUp from '../dom/find-up';
import { memoize } from '../../core/utils';

/**
 * Represents x, y coordinates of a table cell.
 */
export interface CellPosition {
  x: number;
  y: number;
}

/**
 * Get the x, y coordinates of a table cell; normalized for rowspan and colspan
 * @method getCellPosition
 * @memberof axe.commons.table
 * @instance
 * @param  {HTMLTableCellElement} cell The table cell of which to get the position
 * @return {Object} Object with `x` and `y` properties of the coordinates
 */
function getCellPosition(
  cell: HTMLTableCellElement,
  tableGrid?: HTMLTableCellElement[][]
): CellPosition | undefined {
  let rowIndex: number, index: number;
  if (!tableGrid) {
    tableGrid = toGrid(
      findUp(cell, 'table') as HTMLTableElement
    ) as HTMLTableCellElement[][];
  }

  for (rowIndex = 0; rowIndex < tableGrid.length; rowIndex++) {
    if (tableGrid[rowIndex]) {
      index = tableGrid[rowIndex]!.indexOf(cell);
      if (index !== -1) {
        return {
          x: index,
          y: rowIndex
        };
      }
    }
  }
}

export default memoize(
  getCellPosition as (...args: unknown[]) => unknown
) as typeof getCellPosition;
