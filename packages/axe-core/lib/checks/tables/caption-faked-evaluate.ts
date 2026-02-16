import { toGrid } from '../../commons/table';

function captionFakedEvaluate(node: HTMLTableElement): boolean {
  const table = toGrid(node);
  const firstRow = table[0];

  if (
    table.length <= 1 ||
    !firstRow ||
    firstRow.length <= 1 ||
    node.rows.length <= 1
  ) {
    return true;
  }

  return firstRow.reduce((out: boolean, curr: any, i: number) => {
    return out || (curr !== firstRow[i + 1] && firstRow[i + 1] !== undefined);
  }, false);
}

export default captionFakedEvaluate;
