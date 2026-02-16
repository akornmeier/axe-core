/**
 * Represents a direction vector for table traversal.
 */
interface Direction {
  x: number;
  y: number;
}

/**
 * Represents a position in the table grid.
 */
interface Position {
  x: number;
  y: number;
}

/**
 * Callback function for table traversal.
 * Return true to abort traversal.
 */
type TraverseCallback = (
  cell: HTMLTableCellElement,
  position: Position,
  tableGrid: HTMLTableCellElement[][]
) => boolean | void;

/** String direction names */
type DirectionString = 'left' | 'up' | 'right' | 'down';

function traverseTable(
  dir: Direction,
  position: Position,
  tableGrid: HTMLTableCellElement[][],
  callback?: TraverseCallback
): HTMLTableCellElement[] {
  let result: HTMLTableCellElement[] | boolean | void;
  const cell = tableGrid[position.y]
    ? tableGrid[position.y]![position.x]
    : undefined;
  if (!cell) {
    return [];
  }
  if (typeof callback === 'function') {
    result = callback(cell, position, tableGrid);
    if (result === true) {
      // abort
      return [cell];
    }
  }

  result = traverseTable(
    dir,
    {
      x: position.x + dir.x,
      y: position.y + dir.y
    },
    tableGrid,
    callback
  );
  result.unshift(cell);
  return result;
}

/**
 * Traverses a table in a given direction, passing the cell to the callback
 * @method traverse
 * @memberof axe.commons.table
 * @instance
 * @param  {Object|String} dir Direction that will be added recursively {x: 1, y: 0}, 'left';
 * @param  {Object}   startPos    x/y coordinate: {x: 0, y: 0};
 * @param  {Array}    [tablegrid]  A matrix of the table obtained using axe.commons.table.toArray (OPTIONAL)
 * @param  {Function} callback Function to which each cell will be passed
 * @return {NodeElement}       If the callback returns true, the traversal will end and the cell will be returned
 */
function traverse(
  dir: Direction | DirectionString,
  startPos: Position | HTMLTableCellElement[][],
  tableGrid?: HTMLTableCellElement[][] | TraverseCallback,
  callback?: TraverseCallback
): HTMLTableCellElement[] {
  if (Array.isArray(startPos)) {
    callback = tableGrid as TraverseCallback | undefined;
    tableGrid = startPos;
    startPos = { x: 0, y: 0 };
  }

  if (typeof dir === 'string') {
    switch (dir) {
      case 'left':
        dir = { x: -1, y: 0 };
        break;
      case 'up':
        dir = { x: 0, y: -1 };
        break;
      case 'right':
        dir = { x: 1, y: 0 };
        break;
      case 'down':
        dir = { x: 0, y: 1 };
        break;
    }
  }

  return traverseTable(
    dir as Direction,
    {
      x: (startPos as Position).x + (dir as Direction).x,
      y: (startPos as Position).y + (dir as Direction).y
    },
    tableGrid as HTMLTableCellElement[][],
    callback
  );
}

export default traverse;
