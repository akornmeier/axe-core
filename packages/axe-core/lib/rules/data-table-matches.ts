import { isDataTable } from '../commons/table';

function dataTableMatches(node: HTMLElement): boolean {
  return isDataTable(node as HTMLTableElement);
}

export default dataTableMatches;
