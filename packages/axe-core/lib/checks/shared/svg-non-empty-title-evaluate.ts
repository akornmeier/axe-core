import { subtreeText } from '../../commons/text';

function svgNonEmptyTitleEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  if (!virtualNode.children) {
    return undefined;
  }

  const titleNode = virtualNode.children.find(({ props }: any) => {
    return props.nodeName === 'title';
  });

  if (!titleNode) {
    this.data({
      messageKey: 'noTitle'
    });
    return false;
  }

  try {
    const titleText = subtreeText(titleNode, { includeHidden: true }).trim();
    if (titleText === '') {
      this.data({
        messageKey: 'emptyTitle'
      });
      return false;
    }
  } catch {
    return undefined;
  }

  return true;
}

export default svgNonEmptyTitleEvaluate;
