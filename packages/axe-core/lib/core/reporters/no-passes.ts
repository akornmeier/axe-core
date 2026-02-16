import { processAggregate } from './helpers';
import type { ProcessOptions } from './helpers';
import { getEnvironmentData } from '../utils';
import type { Result } from '@axe-core/schemas';

interface ReporterOptions extends ProcessOptions {
  environmentData?: unknown;
}

const noPassesReporter = (
  results: unknown,
  options: unknown,
  callback: (result: unknown) => void
): void => {
  if (typeof options === 'function') {
    callback = options as (result: unknown) => void;
    options = {};
  }
  const opts = (options || {}) as ReporterOptions;
  const { environmentData, ...toolOptions } = opts;
  // limit result processing to types we want to include in the output
  opts.resultTypes = ['violations'];

  const { violations } = processAggregate(
    results as Array<Record<string, unknown>>,
    opts
  ) as {
    violations: Result[];
  };

  callback({
    ...getEnvironmentData(environmentData),
    toolOptions,
    violations
  });
};

export default noPassesReporter;
