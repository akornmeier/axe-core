import parseCrossOriginStylesheet from './parse-crossorigin-stylesheet';

function parseSameOriginStylesheet(
  sheet: CSSStyleSheet,
  options: Record<string, unknown>,
  priority: number[],
  importedUrls: string[],
  isCrossOrigin = false
): Promise<unknown> {
  const rules = Array.from(sheet.cssRules);

  if (!rules) {
    return Promise.resolve();
  }

  const cssImportRules = rules.filter(r => r.type === 3);

  if (!cssImportRules.length) {
    return Promise.resolve({
      isCrossOrigin,
      priority,
      root: options.rootNode,
      shadowId: options.shadowId,
      sheet
    });
  }

  const cssImportUrlsNotAlreadyImported = cssImportRules
    .filter(rule => (rule as CSSImportRule).href)
    .map(rule => (rule as CSSImportRule).href)
    .filter(url => !importedUrls.includes(url));

  const promises = cssImportUrlsNotAlreadyImported.map(
    (importUrl, cssRuleIndex) => {
      const newPriority = [...priority, cssRuleIndex];
      const isCrossOriginRequest = /^https?:\/\/|^\/\//i.test(importUrl);

      return parseCrossOriginStylesheet(
        importUrl,
        options,
        newPriority,
        importedUrls,
        isCrossOriginRequest
      );
    }
  );

  const nonImportCSSRules = rules.filter(r => r.type !== 3);

  if (!nonImportCSSRules.length) {
    return Promise.all(promises);
  }

  promises.push(
    Promise.resolve(
      (
        options.convertDataToStylesheet as (
          opts: Record<string, unknown>
        ) => unknown
      )({
        data: nonImportCSSRules.map(rule => rule.cssText).join(),
        isCrossOrigin,
        priority,
        root: options.rootNode,
        shadowId: options.shadowId
      })
    )
  );

  return Promise.all(promises);
}

export default parseSameOriginStylesheet;
