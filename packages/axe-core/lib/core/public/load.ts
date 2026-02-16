import Audit from '../base/audit';
import cleanup from './cleanup';
import runRules from './run-rules';
import respondable from '../utils/respondable';
import nodeSerializer from '../utils/node-serializer';

declare const axe: {
  _audit: InstanceType<typeof Audit> | null;
  utils: Record<string, unknown>;
  [key: string]: unknown;
};

interface RunCommandData {
  command: string;
  context?: {
    include?: unknown[];
    [key: string]: unknown;
  };
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Sets up Rules, Messages and default options for Checks, must be invoked before attempting analysis
 * @param  audit The "audit specification" object
 * @private
 */
export default function load(audit: unknown): void {
  // @ts-expect-error - Audit constructor accepts unknown config
  axe._audit = new Audit(audit);
}

function runCommand(
  data: RunCommandData,
  _keepalive: unknown,
  callback: (result: unknown) => void
): void {
  const resolve = callback;
  const reject = function reject(err: unknown): void {
    if (err instanceof Error === false) {
      err = new Error(err as string);
    }
    callback(err);
  };

  const context: Record<string, unknown> = (data && data.context) || {};
  if (
    context.hasOwnProperty('include') &&
    !(context.include as unknown[]).length
  ) {
    context.include = [document];
  }
  const options = (data && data.options) || {};

  switch (data.command) {
    case 'rules':
      return runRules(
        context,
        options,
        (results: unknown, cleanupFn: () => void) => {
          // Serialize all DqElements
          results = nodeSerializer.mapRawResults(
            results as Record<string, unknown>[]
          );
          resolve(results);
          // Cleanup AFTER resolve so that selectors can be generated
          cleanupFn();
        },
        reject
      );
    case 'cleanup-plugin':
      return cleanup(resolve, reject);
    default:
      // go through the registered commands
      if (
        axe._audit &&
        (
          axe._audit as unknown as {
            commands: Record<
              string,
              | ((data: unknown, callback: (result: unknown) => void) => void)
              | undefined
            >;
          }
        ).commands &&
        (
          axe._audit as unknown as {
            commands: Record<
              string,
              | ((data: unknown, callback: (result: unknown) => void) => void)
              | undefined
            >;
          }
        ).commands[data.command]
      ) {
        return (
          axe._audit as unknown as {
            commands: Record<
              string,
              (data: unknown, callback: (result: unknown) => void) => void
            >;
          }
        ).commands[data.command]!(data, callback);
      }
  }
}

if (window.top !== window) {
  respondable.subscribe(
    'axe.start',
    runCommand as (
      message: unknown,
      keepalive: boolean | undefined,
      responder: (...args: unknown[]) => void
    ) => void
  );
  respondable.subscribe(
    'axe.ping',
    (
      _data: unknown,
      _keepalive: boolean | undefined,
      respond: (...args: unknown[]) => void
    ) => {
      respond({
        axe: true
      });
    }
  );
}
