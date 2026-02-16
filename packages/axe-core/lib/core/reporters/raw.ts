import { nodeSerializer } from '../utils';
import type { RawResult } from '@axe-core/schemas';

const rawReporter = (
  results: unknown,
  options: unknown,
  callback: (result: unknown) => void
): void => {
  if (typeof options === 'function') {
    callback = options as (result: unknown) => void;
    options = {};
  }

  // Guard against tests which don't pass an array as the first param here.
  if (!results || !Array.isArray(results)) {
    return callback(results);
  }

  const transformedResults = results.map((result: RawResult) => {
    const transformedResult: Record<string, unknown> = { ...result };
    const types = [
      'passes',
      'violations',
      'incomplete',
      'inapplicable'
    ] as const;
    for (const type of types) {
      transformedResult[type] = nodeSerializer.mapRawNodeResults(
        transformedResult[type] as Record<string, unknown>[]
      );
    }

    return transformedResult;
  });

  callback(transformedResults);
};

export default rawReporter;
