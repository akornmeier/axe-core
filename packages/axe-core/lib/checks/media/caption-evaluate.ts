import { querySelectorAll } from '../../core/utils';

function captionEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  const tracks = querySelectorAll(virtualNode, 'track');
  const hasCaptions = tracks.some((vNode: any) => {
    return (vNode.attr('kind') || '').toLowerCase() === 'captions';
  });

  // Undefined if there are no tracks - media may use another caption method
  return hasCaptions ? false : undefined;
}

export default captionEvaluate;
