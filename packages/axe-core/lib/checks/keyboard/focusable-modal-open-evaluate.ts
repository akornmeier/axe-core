import { isModalOpen } from '../../commons/dom';

function focusableModalOpenEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean | undefined {
  const tabbableElements = virtualNode.tabbableElements.map(
    ({ actualNode }: any) => actualNode
  );

  if (!tabbableElements || !tabbableElements.length) {
    return true;
  }

  if (isModalOpen()) {
    this.relatedNodes(tabbableElements);
    return undefined;
  }

  return true;
}

export default focusableModalOpenEvaluate;
