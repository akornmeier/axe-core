interface StylesheetOptions {
  data: unknown;
  isCrossOrigin?: boolean;
  shadowId?: string;
  root?: unknown;
  priority?: unknown;
  isLink?: boolean;
}

interface StylesheetResult {
  sheet: CSSStyleSheet | null;
  isCrossOrigin: boolean;
  shadowId: string | undefined;
  root: unknown;
  priority: unknown;
}

function getStyleSheetFactory(
  dynamicDoc: Document
): (options: StylesheetOptions) => StylesheetResult {
  if (!dynamicDoc) {
    throw new Error(
      'axe.utils.getStyleSheetFactory should be invoked with an argument'
    );
  }

  return (options: StylesheetOptions) => {
    const {
      data,
      isCrossOrigin = false,
      shadowId,
      root,
      priority,
      isLink = false
    } = options;
    const style = dynamicDoc.createElement('style');
    if (isLink) {
      const text = dynamicDoc.createTextNode(
        `@import "${(data as { href: string }).href}"`
      );
      style.appendChild(text);
    } else {
      style.appendChild(dynamicDoc.createTextNode(data as string));
    }
    dynamicDoc.head.appendChild(style);
    return {
      sheet: style.sheet,
      isCrossOrigin,
      shadowId,
      root,
      priority
    };
  };
}

export default getStyleSheetFactory;
