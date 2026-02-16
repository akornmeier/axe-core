import queue from './queue';
import sendCommandToFrame from './send-command-to-frame';
import mergeResults from './merge-results';

/**
 * Sends a message to axe running in frames to start analysis and collate results (via `mergeResults`)
 * @private
 * @param  {Context}  parentContent   The resolved Context object
 * @param  {Object}   options   Options object (as passed to `runRules`)
 * @param  {string}   command   Command sent to all frames
 * @param  {Array}    parameter Array of values to be passed along side the command
 * @param  {Function} callback  Function to call when results from all frames have returned
 */
export default function collectResultsFromFrames(
  parentContent: Record<string, unknown>,
  options: Record<string, unknown>,
  command: string,
  parameter: unknown[],
  resolve: (results: unknown) => void,
  reject: (error: unknown) => void
): void {
  // elementRefs can't be passed across frame boundaries
  options = { ...options, elementRef: false };

  const q = queue();
  const frames = parentContent.frames as Array<Record<string, unknown>>;

  // Tell each axe running in each frame to collect results
  frames.forEach(({ node: frameElement, ...context }) => {
    q.defer((res: (val: unknown) => void, rej: (val: unknown) => void) => {
      const params = { options, command, parameter, context };
      function callback(results: unknown) {
        if (!results) {
          return res(null);
        }
        return res({ results, frameElement });
      }

      sendCommandToFrame(
        frameElement as HTMLIFrameElement,
        params,
        callback,
        rej
      );
    });
  });

  // Combine results from all frames and give it back
  q.then((data: unknown[]) => {
    resolve(mergeResults(data as Array<Record<string, unknown>>, options));
  }).catch(reject);
}
