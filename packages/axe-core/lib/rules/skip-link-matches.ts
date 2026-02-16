import { isSkipLink, isOffscreen } from '../commons/dom';

function skipLinkMatches(node: HTMLElement): boolean {
  return isSkipLink(node as HTMLAnchorElement) && (isOffscreen(node) ?? false);
}

export default skipLinkMatches;
