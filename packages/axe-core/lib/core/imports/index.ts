import './polyfills';

// some of these imports require polyfills to be loaded first
import { CssSelectorParser } from 'css-selector-parser';
// @ts-expect-error - no type declarations for @deque/dot
import doT from '@deque/dot';
import emojiRegexText from 'emoji-regex';
// @ts-expect-error - no type declarations for memoizee
import memoize from 'memoizee';
import Color from 'colorjs.io';
// @ts-expect-error - no type declarations for core-js-pure
import ArrayFrom from 'core-js-pure/actual/array/from';

// prevent striping newline characters from strings (e.g. failure
// summaries). value must be synced with build/configure.js
doT.templateSettings.strip = false;

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
