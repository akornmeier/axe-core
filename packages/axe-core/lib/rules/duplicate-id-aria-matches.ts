import { isAccessibleRef } from '../commons/aria';

function duplicateIdAriaMatches(node: HTMLElement): boolean {
  return isAccessibleRef(node);
}

export default duplicateIdAriaMatches;
