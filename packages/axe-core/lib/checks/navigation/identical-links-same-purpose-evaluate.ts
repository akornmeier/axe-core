import { dom, text } from '../../commons';

function identicalLinksSamePurposeEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  const accText = text.accessibleTextVirtual(virtualNode);
  const name = text
    .sanitize(
      text.removeUnicode(accText, {
        emoji: true,
        nonBmp: true,
        punctuations: true
      })
    )
    .toLowerCase();

  if (!name) {
    return undefined;
  }

  const afterData = {
    name,
    urlProps: dom.urlPropsFromAttribute(node, 'href')
  };
  this.data(afterData);
  this.relatedNodes([node]);

  return true;
}

export default identicalLinksSamePurposeEvaluate;
