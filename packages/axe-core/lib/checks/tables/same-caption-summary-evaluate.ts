import { sanitize, subtreeText } from '../../commons/text';

export default sameCaptionSummaryEvaluate;

function sameCaptionSummaryEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  if (virtualNode.children === undefined) {
    return undefined;
  }

  const summary = virtualNode.attr('summary');
  const captionNode = virtualNode.children.find(isCaptionNode);
  const caption = captionNode ? sanitize(subtreeText(captionNode)) : false;

  if (!caption || !summary) {
    return false;
  }

  return sanitize(summary).toLowerCase() === sanitize(caption).toLowerCase();
}

function isCaptionNode(virtualNode: any): boolean {
  return virtualNode.props.nodeName === 'caption';
}
