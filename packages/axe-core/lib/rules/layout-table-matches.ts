import { isDataTable } from '../commons/table';
import { isFocusable } from '../commons/dom';

function dataTableMatches(node: HTMLElement): boolean {
  return !isDataTable(node as HTMLTableElement) && !isFocusable(node);
}

export default dataTableMatches;
