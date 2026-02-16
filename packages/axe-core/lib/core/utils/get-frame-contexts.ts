import Context from '../base/context';
import getAncestry from './get-ancestry';

export default function getFrameContexts(
  context: unknown,
  options: Record<string, unknown> = {}
): Array<{
  frameSelector: string | string[];
  frameContext: Record<string, unknown>;
}> {
  if (options.iframes === false) {
    return [];
  }

  const { frames } = new (Context as unknown as new (
    context: unknown
  ) => Record<string, unknown>)(context);
  return (frames as Array<Record<string, unknown>>).map(
    ({ node, ...frameContext }: Record<string, unknown>) => {
      (frameContext as Record<string, unknown>).initiator = false;
      const frameSelector = getAncestry(node as Element);
      return { frameSelector, frameContext };
    }
  );
}
