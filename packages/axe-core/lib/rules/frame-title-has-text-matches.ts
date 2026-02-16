import { sanitize } from '../commons/text';

function frameTitleHasTextMatches(node: HTMLElement): boolean {
  const title = node.getAttribute('title');
  return !!sanitize(title);
}

export default frameTitleHasTextMatches;
