import parseSameOriginStylesheet from './parse-sameorigin-stylesheet';
import parseCrossOriginStylesheet from './parse-crossorigin-stylesheet';

function parseStylesheet(
  sheet: CSSStyleSheet,
  options: Record<string, unknown>,
  priority: number[],
  importedUrls: string[],
  isCrossOrigin = false
): Promise<unknown> {
  const isSameOrigin = isSameOriginStylesheet(sheet);
  if (isSameOrigin) {
    return parseSameOriginStylesheet(
      sheet,
      options,
      priority,
      importedUrls,
      isCrossOrigin
    );
  }

  return parseCrossOriginStylesheet(
    sheet.href!,
    options,
    priority,
    importedUrls,
    true
  );
}

function isSameOriginStylesheet(sheet: CSSStyleSheet): boolean {
  try {
    const rules = sheet.cssRules;
    if (!rules && sheet.href) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default parseStylesheet;
