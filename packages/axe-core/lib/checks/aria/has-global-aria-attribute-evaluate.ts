import getGlobalAriaAttrs from '../../commons/standards/get-global-aria-attrs';

function hasGlobalAriaAttributeEvaluate(
  this: any,
  node: HTMLElement,
  options: Record<string, unknown>,
  virtualNode: any
): boolean {
  const globalAttrs = getGlobalAriaAttrs().filter((attr: string) =>
    virtualNode.hasAttr(attr)
  );
  this.data(globalAttrs);
  return globalAttrs.length > 0;
}

export default hasGlobalAriaAttributeEvaluate;
