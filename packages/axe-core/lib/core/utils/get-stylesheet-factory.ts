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
  shadowId?: string;
  root?: unknown;
  priority?: unknown;
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
    const result: StylesheetResult = {
      sheet: style.sheet,
      isCrossOrigin
    };
    if (shadowId !== undefined) {
      result.shadowId = shadowId;
    }
    if (root !== undefined) {
      result.root = root;
    }
    if (priority !== undefined) {
      result.priority = priority;
    }
    return result;
  };
}

export default getStyleSheetFactory;
