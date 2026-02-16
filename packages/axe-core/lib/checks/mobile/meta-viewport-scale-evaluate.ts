function metaViewportScaleEvaluate(
  this: any,
  node: HTMLElement,
  options: any,
  virtualNode: any
): boolean {
  const { scaleMinimum = 2, lowerBound = false } = options || {};

  const content = virtualNode.attr('content') || '';
  if (!content) {
    return true;
  }

  const result: Record<string, any> = content
    .split(/[;,]/)
    .reduce((out: any, item: string) => {
      const contentValue = item.trim();
      if (!contentValue) {
        return out;
      }

      const [key, value] = contentValue.split('=');
      if (!key || !value) {
        return out;
      }
      const curatedKey = key.toLowerCase().trim();
      let curatedValue: any = value.toLowerCase().trim();

      // convert `yes` to `1`
      if (curatedKey === 'maximum-scale' && curatedValue === 'yes') {
        curatedValue = 1;
      }
      // when negative ignore key
      if (curatedKey === 'maximum-scale' && parseFloat(curatedValue) < 0) {
        return out;
      }

      out[curatedKey] = curatedValue;
      return out;
    }, {});

  if (
    lowerBound &&
    result['maximum-scale'] &&
    parseFloat(result['maximum-scale']) < lowerBound
  ) {
    return true;
  }

  if (!lowerBound && result['user-scalable'] === 'no') {
    this.data('user-scalable=no');
    return false;
  }

  const userScalableAsFloat = parseFloat(result['user-scalable']);
  if (
    !lowerBound &&
    result['user-scalable'] &&
    (userScalableAsFloat || userScalableAsFloat === 0) &&
    userScalableAsFloat > -1 &&
    userScalableAsFloat < 1
  ) {
    this.data('user-scalable');
    return false;
  }

  if (
    result['maximum-scale'] &&
    parseFloat(result['maximum-scale']) < scaleMinimum
  ) {
    this.data('maximum-scale');
    return false;
  }

  return true;
}

export default metaViewportScaleEvaluate;
