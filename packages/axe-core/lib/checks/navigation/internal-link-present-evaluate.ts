import { querySelectorAll } from '../../core/utils';

function internalLinkPresentEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const links = querySelectorAll(virtualNode, 'a[href]');
  return links.some((vLink: any) => {
    return /^#[^/!]/.test(vLink.attr('href'));
  });
}

export default internalLinkPresentEvaluate;
