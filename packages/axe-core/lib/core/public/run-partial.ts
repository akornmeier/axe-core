import Context from '../base/context';
import teardown from './teardown';
import {
  nodeSerializer,
  getSelectorData,
  assert,
  getEnvironmentData
} from '../utils';
import normalizeRunParams from './run/normalize-run-params';
import type { EnvironmentData } from '@axe-core/schemas';

declare const axe: {
  _audit: {
    run: (
      context: unknown,
      options: unknown,
      resolve: (results: unknown) => void,
      reject: (error: unknown) => void
    ) => void;
  } | null;
  _tree: unknown[] | undefined;
  _selectorData: unknown;
  _running: boolean;
};

interface PartialRunResult {
  results: unknown;
  frames: Record<string, unknown>[];
  environmentData?: EnvironmentData | undefined;
}

export default function runPartial(
  ...args: unknown[]
): Promise<PartialRunResult> {
  const { options, context } = normalizeRunParams(args);
  assert(axe._audit, 'Axe is not configured. Audit is missing.');
  assert(
    !axe._running,
    'Axe is already running. Use `await axe.run()` to wait ' +
      'for the previous run to finish before starting a new run.'
  );

  // @ts-expect-error - Context constructor accepts various input shapes
  const contextObj = new Context(context, axe._tree);
  axe._tree = (contextObj as unknown as { flatTree: unknown[] }).flatTree;
  axe._selectorData = getSelectorData(axe._tree);
  axe._running = true;

  // Even in the top frame, we don't support this with runPartial
  (options as Record<string, unknown>).elementRef = false;

  return (
    new Promise<unknown>((res, rej) => {
      axe._audit!.run(contextObj, options, res, rej);
    })
      .then((results): PartialRunResult => {
        results = nodeSerializer.mapRawResults(
          results as Record<string, unknown>[]
        );
        const frames = (
          contextObj as unknown as { frames: Array<{ node: unknown }> }
        ).frames.map(({ node }) => {
          return nodeSerializer.toSpec(node);
        });
        let environmentData: EnvironmentData | undefined;
        if ((contextObj as unknown as { initiator: boolean }).initiator) {
          environmentData = getEnvironmentData() as EnvironmentData;
        }
        axe._running = false;
        teardown();
        return { results, frames, environmentData };
      })
      // Avoid .finally() to deal with Mocha 9 + IE issues
      .catch(err => {
        axe._running = false;
        teardown();
        return Promise.reject(err);
      })
  );
}
