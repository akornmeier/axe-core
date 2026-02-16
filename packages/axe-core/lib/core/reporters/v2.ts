import { processAggregate } from './helpers';
import type { ProcessOptions } from './helpers';
import { getEnvironmentData } from '../utils';
import type { AxeResults } from '@axe-core/schemas';

interface ReporterOptions extends ProcessOptions {
  environmentData?: unknown;
}

const v2Reporter = (
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
  const out = processAggregate(results as Array<Record<string, unknown>>, opts);
  callback({
    ...getEnvironmentData(environmentData),
    toolOptions,
    ...out
  } as unknown as AxeResults);
};

export default v2Reporter;
