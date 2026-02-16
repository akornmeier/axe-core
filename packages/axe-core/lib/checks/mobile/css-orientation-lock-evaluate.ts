function cssOrientationLockEvaluate(
  this: any,
  node: HTMLElement,
  options: any,
  virtualNode: any,
  context: any
): boolean | undefined {
  const { cssom = undefined } = context || {};
  const { degreeThreshold = 0 } = options || {};
  if (!cssom || !cssom.length) {
    return undefined;
  }

  let isLocked = false;
  let relatedElements: HTMLElement[] = [];
  const rulesGroupByDocumentFragment = groupCssomByDocument(cssom);

  for (const key of Object.keys(rulesGroupByDocumentFragment)) {
    const { root, rules } = rulesGroupByDocumentFragment[key];
    const orientationRules = rules.filter(isMediaRuleWithOrientation);
    if (!orientationRules.length) {
      continue;
    }

    orientationRules.forEach(({ cssRules }: any) => {
      Array.from(cssRules).forEach((cssRule: any) => {
        const locked = getIsOrientationLocked(cssRule);

        // if locked and not root HTML, preserve as relatedNodes
        if (locked && cssRule.selectorText.toUpperCase() !== 'HTML') {
          const elms =
            Array.from(
              root.querySelectorAll(
                cssRule.selectorText
              ) as NodeListOf<HTMLElement>
            ) || [];
          relatedElements = relatedElements.concat(elms);
        }

        isLocked = isLocked || locked;
      });
    });
  }

  if (!isLocked) {
    return true;
  }
  if (relatedElements.length) {
    this.relatedNodes(relatedElements);
  }
  return false;

  function groupCssomByDocument(cssObjectModel: any[]): Record<string, any> {
    return cssObjectModel.reduce((out: any, { sheet, root, shadowId }: any) => {
      const key = shadowId ? shadowId : 'topDocument';

      if (!out[key]) {
        out[key] = { root, rules: [] };
      }

      if (!sheet || !sheet.cssRules) {
        return out;
      }

      const rules = Array.from(sheet.cssRules);
      out[key].rules = out[key].rules.concat(rules);

      return out;
    }, {});
  }

  function isMediaRuleWithOrientation({ type, cssText }: any): boolean {
    if (type !== 4) {
      return false;
    }

    return (
      /orientation:\s*landscape/i.test(cssText) ||
      /orientation:\s*portrait/i.test(cssText)
    );
  }

  function getIsOrientationLocked({ selectorText, style }: any): boolean {
    if (!selectorText || style.length <= 0) {
      return false;
    }

    const transformStyle =
      style.transform || style.webkitTransform || style.msTransform || false;
    if (!transformStyle && !style.rotate) {
      return false;
    }

    const transformDegrees = getTransformDegrees(transformStyle);
    const rotateDegrees = getRotationInDegrees('rotate', style.rotate);

    // `transform: rotate` and `rotate` are additive
    let degrees = transformDegrees + rotateDegrees;
    if (!degrees) {
      return false;
    }
    degrees = Math.abs(degrees);

    if (Math.abs(degrees - 180) % 180 <= degreeThreshold) {
      return false;
    }

    return Math.abs(degrees - 90) % 90 <= degreeThreshold;
  }

  function getTransformDegrees(transformStyle: string): number {
    if (!transformStyle) {
      return 0;
    }

    const matches = transformStyle.match(
      /(rotate|rotateZ|rotate3d|matrix|matrix3d)\(([^)]+)\)(?!.*(rotate|rotateZ|rotate3d|matrix|matrix3d))/
    );
    if (!matches) {
      return 0;
    }

    const [, transformFn, transformFnValue] = matches;
    return getRotationInDegrees(transformFn ?? '', transformFnValue ?? '');
  }

  function getRotationInDegrees(
    transformFunction: string,
    transformFnValue: string
  ): number {
    switch (transformFunction) {
      case 'rotate':
      case 'rotateZ':
        return getAngleInDegrees(transformFnValue);
      case 'rotate3d': {
        const [, , z, angleWithUnit] = transformFnValue
          .split(',')
          .map((value: string) => value.trim());
        if (parseInt(z ?? '0') === 0) {
          return 0;
        }
        return getAngleInDegrees(angleWithUnit ?? '');
      }
      case 'matrix':
      case 'matrix3d':
        return getAngleInDegreesFromMatrixTransform(transformFnValue);
      default:
        return 0;
    }
  }

  function getAngleInDegrees(angleWithUnit: string): number {
    const [unit] =
      angleWithUnit.match(/(deg|grad|rad|turn)/) ?? ([] as string[]);
    if (!unit) {
      return 0;
    }

    const angle = parseFloat(angleWithUnit.replace(unit, ``));
    switch (unit) {
      case 'rad':
        return convertRadToDeg(angle);
      case 'grad':
        return convertGradToDeg(angle);
      case 'turn':
        return convertTurnToDeg(angle);
      case 'deg':
      default:
        return parseInt(String(angle));
    }
  }

  function getAngleInDegreesFromMatrixTransform(
    transformFnValue: string
  ): number {
    const values = transformFnValue.split(',');

    if (values.length <= 6) {
      const [a, b] = values;
      const radians = Math.atan2(parseFloat(b ?? '0'), parseFloat(a ?? '0'));
      return convertRadToDeg(radians);
    }

    const sinB = parseFloat(values[8] ?? '0');
    const b = Math.asin(sinB);
    const cosB = Math.cos(b);
    const rotateZRadians = Math.acos(parseFloat(values[0] ?? '0') / cosB);
    return convertRadToDeg(rotateZRadians);
  }

  function convertRadToDeg(radians: number): number {
    return Math.round(radians * (180 / Math.PI));
  }

  function convertGradToDeg(grad: number): number {
    grad = grad % 400;
    if (grad < 0) {
      grad += 400;
    }
    return Math.round((grad / 400) * 360);
  }

  function convertTurnToDeg(turn: number): number {
    return Math.round(360 / (1 / turn));
  }
}

export default cssOrientationLockEvaluate;
