import standards from '../../standards';

/**
 * Verifies that if a given html tag is valid
 */
function isHtmlElement(node: Record<string, unknown> | Element): boolean {
  const nodeName = (node as Record<string, unknown>).props
    ? ((node as Record<string, unknown>).props as Record<string, unknown>)
        .nodeName
    : (node as Element).nodeName.toLowerCase();

  if ((node as Element).namespaceURI === 'http://www.w3.org/2000/svg') {
    return false;
  }

  return (
    !!(standards as Record<string, unknown>).htmlElms &&
    !!(
      (standards as Record<string, Record<string, unknown>>).htmlElms as Record<
        string,
        unknown
      >
    )[nodeName as string]
  );
}

export default isHtmlElement;
