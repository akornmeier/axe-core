import { processAggregate, failureSummary } from './helpers';
import type { ProcessOptions } from './helpers';
import { getEnvironmentData } from '../utils';
import type { AxeResults, Result, NodeResult } from '@axe-core/schemas';

interface ReporterOptions extends ProcessOptions {
  environmentData?: unknown;
}

const v1Reporter = (
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

  const addFailureSummaries = (result: Result): void => {
    result.nodes.forEach((nodeResult: NodeResult) => {
      (nodeResult as NodeResult & { failureSummary: string }).failureSummary =
        failureSummary(nodeResult);
    });
  };

  const typedOut = out as { incomplete: Result[]; violations: Result[] };
  typedOut.incomplete.forEach(addFailureSummaries);
  typedOut.violations.forEach(addFailureSummaries);

  callback({
    ...getEnvironmentData(environmentData),
    toolOptions,
    ...out
  } as unknown as AxeResults);
};

export default v1Reporter;
