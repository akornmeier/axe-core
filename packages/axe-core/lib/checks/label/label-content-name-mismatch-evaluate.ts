import {
  accessibleText,
  isHumanInterpretable,
  subtreeText,
  sanitize,
  removeUnicode
} from '../../commons/text';

/**
 * Check if a given text exists in another
 */
function isStringContained(compare: string, compareWith: string): boolean {
  const curatedCompareWith = curateString(compareWith);
  const curatedCompare = curateString(compare);
  if (!curatedCompareWith || !curatedCompare) {
    return false;
  }
  return curatedCompareWith.includes(curatedCompare);
}

/**
 * Curate given text, by removing emoji's, punctuations, unicode and trim whitespace.
 */
function curateString(str: string): string {
  const noUnicodeStr = removeUnicode(str, {
    emoji: true,
    nonBmp: true,
    punctuations: true
  });
  return sanitize(noUnicodeStr);
}

function labelContentNameMismatchEvaluate(
  node: HTMLElement,
  options: any,
  virtualNode: any
): boolean | undefined {
  const pixelThreshold = options?.pixelThreshold;
  const occurrenceThreshold =
    options?.occurrenceThreshold ?? options?.occuranceThreshold;
  const accText = accessibleText(node).toLowerCase();
  const visibleText = sanitize(
    subtreeText(virtualNode, {
      subtreeDescendant: true,
      ignoreIconLigature: true,
      pixelThreshold,
      occurrenceThreshold
    })
  ).toLowerCase();

  if (!visibleText) {
    return true;
  }

  if (
    isHumanInterpretable(accText) < 1 ||
    isHumanInterpretable(visibleText) < 1
  ) {
    return undefined;
  }

  return isStringContained(visibleText, accText);
}

export default labelContentNameMismatchEvaluate;
