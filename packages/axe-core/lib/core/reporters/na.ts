import { processAggregate } from './helpers';
import type { ProcessOptions } from './helpers';
import { getEnvironmentData } from '../utils';
import type { AxeResults } from '@axe-core/schemas';

interface ReporterOptions extends ProcessOptions {
  environmentData?: unknown;
}

// @deprecated
const naReporter = (
  results: unknown,
  options: unknown,
  callback: (result: unknown) => void
): void => {
  console.warn(
    '"na" reporter will be deprecated in axe v4.0. Use the "v2" reporter instead.'
  );
  if (typeof options === 'function') {
    callback = options as (result: unknown) => void;
    options = {};
  }

  const opts = (options || {}) as ReporterOptions;
  const { environmentData, ...toolOptions } = opts;
  callback({
    ...getEnvironmentData(environmentData),
    toolOptions,
    ...processAggregate(results as Array<Record<string, unknown>>, opts)
  } as unknown as AxeResults);
};

export default naReporter;
