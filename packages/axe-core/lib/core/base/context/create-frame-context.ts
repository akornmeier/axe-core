import { parseTabindex } from '../../utils';

interface FrameContextParent {
  focusable: boolean;
  page: boolean | undefined;
}

interface FrameSize {
  width: number;
  height: number;
}

interface FrameContext {
  node: Element;
  include: unknown[];
  exclude: unknown[];
  initiator: boolean;
  focusable: boolean;
  size: FrameSize;
  page: boolean | undefined;
}

export function createFrameContext(
  frame: Element,
  { focusable, page }: FrameContextParent
): FrameContext {
  return {
    node: frame,
    include: [],
    exclude: [],
    initiator: false,
    focusable: focusable && frameFocusable(frame),
    size: getBoundingSize(frame),
    page
  };
}

function frameFocusable(frame: Element): boolean {
  const tabIndex = parseTabindex(frame.getAttribute('tabindex'));
  return tabIndex === null || tabIndex >= 0;
}

function getBoundingSize(domNode: Element): FrameSize {
  let width = parseInt(domNode.getAttribute('width') as string, 10);
  let height = parseInt(domNode.getAttribute('height') as string, 10);

  if (isNaN(width) || isNaN(height)) {
    const rect = domNode.getBoundingClientRect();
    width = isNaN(width) ? rect.width : width;
    height = isNaN(height) ? rect.height : height;
  }
  return { width, height };
}
