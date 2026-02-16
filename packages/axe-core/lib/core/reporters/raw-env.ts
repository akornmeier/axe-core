import { getEnvironmentData } from '../utils';
import rawReporter from './raw';

interface RawEnvReporterOptions {
  environmentData?: unknown;
  [key: string]: unknown;
}

const rawEnvReporter = (
  results: unknown,
  options: unknown,
  callback: (result: unknown) => void
): void => {
  if (typeof options === 'function') {
    callback = options as (result: unknown) => void;
    options = {};
  }
  const opts = (options || {}) as RawEnvReporterOptions;
  const { environmentData, ...toolOptions } = opts;
  rawReporter(results, toolOptions, (raw: unknown) => {
    const env = getEnvironmentData(environmentData);
    callback({ raw, env });
  });
};

export default rawEnvReporter;
