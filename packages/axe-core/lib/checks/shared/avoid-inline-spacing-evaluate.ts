function avoidInlineSpacingEvaluate(
  this: any,
  node: HTMLElement,
  options: any
): boolean {
  const overriddenProperties = options.cssProperties.filter(
    (property: string) => {
      if (node.style.getPropertyPriority(property) === `important`) {
        return property;
      }
    }
  );

  if (overriddenProperties.length > 0) {
    this.data(overriddenProperties);
    return false;
  }

  return true;
}

export default avoidInlineSpacingEvaluate;
