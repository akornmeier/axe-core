import { getReporter } from './reporter';
import type { ReporterCallback } from './reporter';
import normalizeRunParams from './run/normalize-run-params';
import { setupGlobals } from './run/globals-setup';
import { assert } from '../utils';
import performanceTimer from '../utils/performance-timer';

declare const axe: {
  _audit: unknown;
  _running: boolean;
  _runRules: (
    context: unknown,
    options: unknown,
    resolve: (results: unknown, teardown: () => void) => void,
    reject: (error: unknown) => void
  ) => void;
  log: (...args: unknown[]) => void;
};

type RunCallback = ((error: unknown, results?: unknown) => void) | (() => void);

const noop: () => void = () => {};

/**
 * Runs a number of rules against the provided HTML page and returns the
 * resulting issue list
 *
 * @param  args  Variable arguments: context, options, callback
 * @return Resolves with the axe results. Only available when natively supported
 */
export default function run(...args: unknown[]): Promise<unknown> | void {
  setupGlobals(args[0]);
  const { context, options, callback = noop } = normalizeRunParams(args);
  const { thenable, resolve, reject } = getPromiseHandlers(
    callback as RunCallback
  );
  try {
    assert(axe._audit, 'No audit configured');
    assert(
      !axe._running,
      'Axe is already running. Use `await axe.run()` to wait ' +
        'for the previous run to finish before starting a new run.'
    );
  } catch (e) {
    return handleError(e as Error, callback as RunCallback);
  }

  axe._running = true;
  if ((options as Record<string, unknown>).performanceTimer) {
    performanceTimer.start();
  }

  function handleRunRules(rawResults: unknown, teardown: () => void): void {
    const respond = (results: unknown): void => {
      if ((options as Record<string, unknown>).performanceTimer) {
        performanceTimer.mark('reporterEnd');
        performanceTimer.measure('reporter', 'reporterStart', 'reporterEnd');
        performanceTimer.logMeasures('reporter');
        performanceTimer.end();
      }
      axe._running = false;
      teardown();
      try {
        resolve!(results);
      } catch (e) {
        axe.log(e);
      }
    };
    const wrappedReject = (err: unknown): void => {
      axe._running = false;
      teardown();
      try {
        reject!(err);
      } catch (e) {
        axe.log(e);
      }
    };

    try {
      if ((options as Record<string, unknown>).performanceTimer) {
        performanceTimer.mark('reporterStart');
      }
      createReport(
        rawResults,
        options as Record<string, unknown>,
        respond,
        wrappedReject
      );
    } catch (err) {
      wrappedReject(err);
    }
  }

  function errorRunRules(err: unknown): void {
    if ((options as Record<string, unknown>).performanceTimer) {
      performanceTimer.end();
    }
    axe._running = false;
    (callback as RunCallback)(err);
    reject!(err);
  }

  axe._runRules(context, options, handleRunRules, errorRunRules);
  return thenable;
}

function getPromiseHandlers(callback: RunCallback): {
  thenable: Promise<unknown> | undefined;
  reject: ((error: unknown) => void) | undefined;
  resolve: ((result: unknown) => void) | undefined;
} {
  let thenable: Promise<unknown> | undefined;
  let reject: ((error: unknown) => void) | undefined;
  let resolve: ((result: unknown) => void) | undefined;

  if (typeof Promise === 'function' && callback === noop) {
    thenable = new Promise((_resolve, _reject) => {
      reject = _reject;
      resolve = _resolve;
    });
  } else {
    resolve = (result: unknown) =>
      (callback as (error: null, results: unknown) => void)(null, result);
    reject = (err: unknown) => callback(err);
  }
  return { thenable, reject, resolve };
}

function createReport(
  rawResults: unknown,
  options: Record<string, unknown>,
  respond: (results: unknown) => void,
  reject: (error: unknown) => void
): void {
  const reporter = getReporter(
    options.reporter as string | undefined
  ) as ReporterCallback;
  const results = reporter(rawResults, options, respond, reject);
  if (results !== undefined) {
    respond(results);
  }
}

function handleError(err: Error, callback: RunCallback): void {
  if (typeof callback === 'function' && callback !== noop) {
    callback(err.message);
    return;
  }
  throw err;
}
