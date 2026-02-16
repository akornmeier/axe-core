import { sanitize, subtreeText } from '../../commons/text';

export default function hasTextContentEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  try {
    return sanitize(subtreeText(virtualNode)) !== '';
  } catch {
    return undefined;
  }
}
