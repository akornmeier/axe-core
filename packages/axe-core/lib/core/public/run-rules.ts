import Context from '../base/context';
import teardown from './teardown';
import {
  getSelectorData,
  queue,
  performanceTimer,
  collectResultsFromFrames,
  mergeResults,
  publishMetaData,
  finalizeRuleResult
} from '../utils';
import log from '../log';

declare const axe: {
  _audit: {
    run: (
      context: unknown,
      options: unknown,
      resolve: (results: unknown) => void,
      reject: (error: unknown) => void
    ) => void;
    after: (
      results: Record<string, unknown>[],
      options: unknown
    ) => Record<string, unknown>[];
  };
  _tree: unknown[] | undefined;
  _selectorData: unknown;
};

interface RunRulesOptions {
  performanceTimer?: boolean;
  iframes?: boolean;
  [key: string]: unknown;
}

/**
 * Starts analysis on the current document and its subframes
 * @private
 * @param  context  The `Context` specification object @see Context
 * @param  options  Optional RuleOptions
 * @param  resolve  Called when done running rules, receives ([results : Object], teardown : Function)
 * @param  reject   Called when execution failed, receives (err : Error)
 */
export default function runRules(
  context: unknown,
  options: RunRulesOptions,
  resolve: (results: unknown, teardown: () => void) => void,
  reject: (error: unknown) => void
): void {
  try {
    // @ts-expect-error - Context constructor accepts various input shapes
    context = new Context(context);
    axe._tree = (context as unknown as { flatTree: unknown[] }).flatTree;
    axe._selectorData = getSelectorData(axe._tree);
  } catch (e) {
    teardown();
    return reject(e);
  }

  const q = queue();
  const audit = axe._audit;

  if (options.performanceTimer) {
    performanceTimer.auditStart();
  }

  if (
    (context as unknown as { frames: unknown[] }).frames.length &&
    options.iframes !== false
  ) {
    q.defer((res: (result: unknown) => void, rej: (error: unknown) => void) => {
      collectResultsFromFrames(
        context as Record<string, unknown>,
        options,
        'rules',
        [] as unknown[],
        res,
        rej
      );
    });
  }
  q.defer((res: (result: unknown) => void, rej: (error: unknown) => void) => {
    audit.run(context, options, res, rej);
  });
  q.then((data: unknown[]) => {
    try {
      if (options.performanceTimer) {
        performanceTimer.auditEnd();
      }

      // Add wrapper object so that we may use the same "merge" function for results from inside and outside frames
      let results: unknown = mergeResults(
        data.map(res => {
          return { results: res } as Record<string, unknown>;
        }),
        options as Record<string, unknown>
      );

      // after should only run once, so ensure we are in the top level window
      if ((context as unknown as { initiator: boolean }).initiator) {
        if (options.performanceTimer) {
          performanceTimer.mark('auditAfterStart');
        }
        results = audit.after(results as Record<string, unknown>[], options);
        if (options.performanceTimer) {
          performanceTimer.mark('auditAfterEnd');
          performanceTimer.measure(
            'audit.after',
            'auditAfterStart',
            'auditAfterEnd'
          );
          performanceTimer.logMeasures('audit.after');
        }
        (results as Record<string, unknown>[]).forEach(publishMetaData);
        results = (results as Record<string, unknown>[]).map(
          finalizeRuleResult
        );
      }
      try {
        resolve(results, teardown);
      } catch (e) {
        teardown();
        log(e);
      }
    } catch (e) {
      teardown();
      reject(e);
    }
  }).catch((e: unknown) => {
    teardown();
    reject(e);
  });
}
