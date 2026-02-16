import { clone, isContextSpec } from '../../utils';

declare const axe: {
  _audit: {
    reporter: string;
  } | null;
};

interface NormalizedRunParams {
  context: unknown;
  options: Record<string, unknown>;
  callback?: ((...args: unknown[]) => void) | undefined;
}

/**
 * Normalize the optional params of axe.run()
 * @param  args  Array of [context, options, callback]
 * @return With 3 keys: context, options, callback
 */
export default function normalizeRunParams([
  context,
  options,
  callback
]: unknown[]): NormalizedRunParams {
  const typeErr = new TypeError('axe.run arguments are invalid');

  // Determine the context
  if (!isContextSpec(context)) {
    if (callback !== undefined) {
      // Either context is invalid or there are too many params
      throw typeErr;
    }
    // Set default and shift one over
    callback = options as ((...args: unknown[]) => void) | undefined;
    options = context;
    context = document;
  }

  // Determine the options
  if (typeof options !== 'object') {
    if (callback !== undefined) {
      // Either options is invalid or there are too many params
      throw typeErr;
    }
    // Set default and shift one over
    callback = options as ((...args: unknown[]) => void) | undefined;
    options = {};
  }

  // Set the callback or noop;
  if (typeof callback !== 'function' && callback !== undefined) {
    throw typeErr;
  }

  options = clone(options) as Record<string, unknown>;
  (options as Record<string, unknown>).reporter =
    (options as Record<string, unknown>).reporter ??
    axe._audit?.reporter ??
    'v1';
  return {
    context,
    options: options as Record<string, unknown>,
    callback: callback as ((...args: unknown[]) => void) | undefined
  };
}
