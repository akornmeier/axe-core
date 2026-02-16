declare const axe: {
  _audit: unknown;
  log: (...args: unknown[]) => void;
  plugins: Record<
    string,
    { cleanup: (resolve: () => void, reject: (err: unknown) => void) => void }
  >;
  utils: {
    queue: () => {
      defer: (
        fn: (
          resolve: (...args: unknown[]) => void,
          reject: (...args: unknown[]) => void
        ) => void
      ) => void;
      then: (fn: (results: unknown[]) => void) => {
        catch: (fn: (err: unknown) => void) => void;
      };
    };
    getFlattenedTree: (node: Node) => unknown[];
    querySelectorAll: (
      tree: unknown[],
      selector: string
    ) => Array<{ actualNode: Element }>;
    sendCommandToFrame: (
      node: Element,
      data: Record<string, unknown>,
      resolve: (...args: unknown[]) => void,
      reject: (...args: unknown[]) => void
    ) => void;
  };
};

function cleanup(
  resolve?: (results: unknown) => void,
  reject?: (errors: unknown) => void
): void {
  resolve = resolve || function res() {};
  reject = reject || axe.log;

  if (!axe._audit) {
    throw new Error('No audit configured');
  }

  const q = axe.utils.queue();
  // If a plugin fails its cleanup, we still want the others to run
  const cleanupErrors: unknown[] = [];

  Object.keys(axe.plugins).forEach(key => {
    q.defer(res => {
      const rej = function rej(err: unknown): void {
        cleanupErrors.push(err);
        res();
      };
      try {
        axe.plugins[key]!.cleanup(res, rej);
      } catch (err) {
        rej(err);
      }
    });
  });

  const flattenedTree = axe.utils.getFlattenedTree(document.body);

  axe.utils.querySelectorAll(flattenedTree, 'iframe, frame').forEach(node => {
    q.defer((res, rej) => {
      return axe.utils.sendCommandToFrame(
        node.actualNode,
        {
          command: 'cleanup-plugin'
        },
        res,
        rej
      );
    });
  });

  q.then(results => {
    if (cleanupErrors.length === 0) {
      resolve!(results);
    } else {
      reject!(cleanupErrors);
    }
  }).catch(reject!);
}

export default cleanup;
