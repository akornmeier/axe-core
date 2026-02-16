/*exported axe, commons */
/*global axeFunction, module, define */
// exported namespace for axe
/*eslint no-use-before-define: 0, no-unused-vars: 0*/

declare const axeFunction: {
  toString: () => string;
};

declare function define(
  name: string,
  deps: unknown[],
  factory: () => unknown
): void;
declare namespace define {
  const amd: boolean | undefined;
}

declare const axe: Record<string, unknown> & {
  version: string;
  source?: string;
};

const _axe: Record<string, unknown> = axe || {};
_axe.version = '<%= pkg.version %>';

if (typeof define === 'function' && define.amd) {
  // Explicitly naming the module to avoid mismatched anonymous define() modules when injected in a page
  define('axe-core', [], () => _axe);
}
if (
  typeof module === 'object' &&
  module.exports &&
  typeof axeFunction.toString === 'function'
) {
  (_axe as { source?: string }).source =
    '(' +
    axeFunction.toString() +
    ')(typeof window === "object" ? window : this);';
  module.exports = _axe;
}
if (typeof window.getComputedStyle === 'function') {
  (window as unknown as { axe: unknown }).axe = _axe;
}
// local namespace for common functions
let commons: unknown;
