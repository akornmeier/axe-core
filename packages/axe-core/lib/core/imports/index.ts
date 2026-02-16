import './polyfills';

import { CssSelectorParser } from 'css-selector-parser';
// @ts-expect-error - no type declarations for @deque/dot
import doT from '@deque/dot';
import emojiRegexText from 'emoji-regex';
// @ts-expect-error - no type declarations for memoizee
import memoize from 'memoizee';
import Color from 'colorjs.io';

// prevent striping newline characters from strings (e.g. failure
// summaries). value must be synced with build/configure.js
doT.templateSettings.strip = false;

// Native Array.from (ES2015+) — replaces core-js-pure polyfill
const ArrayFrom = Array.from;

/**
 * Namespace `axe.imports` which holds required external dependencies
 *
 * @namespace imports
 * @memberof axe
 */
export {
  CssSelectorParser,
  doT,
  emojiRegexText,
  memoize,
  Color as Colorjs,
  ArrayFrom
};
