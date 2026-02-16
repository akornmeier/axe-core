import { insertedIntoFocusOrder } from '../commons/dom';

function insertedIntoFocusOrderMatches(node: HTMLElement): boolean {
  return insertedIntoFocusOrder(node);
}

export default insertedIntoFocusOrderMatches;
