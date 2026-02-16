function frameTestedEvaluate(
  node: HTMLElement,
  options: any
): boolean | undefined {
  // assume iframe is not tested
  return options.isViolation ? false : undefined;
}

export default frameTestedEvaluate;
