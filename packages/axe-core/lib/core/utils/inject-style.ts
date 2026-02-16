let styleSheet: HTMLStyleElement | undefined;
function injectStyle(style: string): HTMLStyleElement | undefined {
  if (styleSheet && styleSheet.parentNode) {
    if (
      (styleSheet as unknown as Record<string, unknown>).styleSheet ===
      undefined
    ) {
      styleSheet.appendChild(document.createTextNode(style));
    } else {
      (
        (styleSheet as unknown as Record<string, unknown>).styleSheet as Record<
          string,
          string
        >
      ).cssText += style;
    }
    return styleSheet;
  }
  if (!style) {
    return;
  }

  const head = document.head || document.getElementsByTagName('head')[0];
  styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';

  if (
    (styleSheet as unknown as Record<string, unknown>).styleSheet === undefined
  ) {
    styleSheet.appendChild(document.createTextNode(style));
  } else {
    (
      (styleSheet as unknown as Record<string, unknown>).styleSheet as Record<
        string,
        string
      >
    ).cssText = style;
  }

  head.appendChild(styleSheet);

  return styleSheet;
}

export default injectStyle;
