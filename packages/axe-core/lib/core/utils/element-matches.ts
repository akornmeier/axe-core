/**
 * Polyfill for Element#matches
 * @param {HTMLElement} node The element to test
 * @param {String} selector The selector to test element against
 * @return {Boolean}
 */
const matchesSelector = (() => {
  let method: string | undefined;

  function getMethod(node: Record<string, unknown>): string | undefined {
    const candidates = [
      'matches',
      'matchesSelector',
      'mozMatchesSelector',
      'webkitMatchesSelector',
      'msMatchesSelector'
    ];
    const length = candidates.length;
    let index: number, candidate: string;

    for (index = 0; index < length; index++) {
      candidate = candidates[index]!;
      if (node[candidate]) {
        return candidate;
      }
    }
  }

  return (node: Element, selector: string): boolean => {
    if (!method || !(node as unknown as Record<string, unknown>)[method]) {
      method = getMethod(node as unknown as Record<string, unknown>);
    }

    if (method && (node as unknown as Record<string, unknown>)[method]) {
      return (
        (node as unknown as Record<string, unknown>)[method] as (
          sel: string
        ) => boolean
      )(selector);
    }

    return false;
  };
})();

export default matchesSelector;
