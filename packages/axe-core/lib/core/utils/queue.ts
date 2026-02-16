import log from '../log';

function noop(): void {}
function funcGuard(f: unknown): void {
  if (typeof f !== 'function') {
    throw new TypeError('Queue methods require functions as arguments');
  }
}

interface QueueInstance {
  defer(fn: unknown): QueueInstance;
  then(fn: (tasks: unknown[]) => void): QueueInstance;
  catch(fn: (err: unknown) => void): QueueInstance;
  abort(msg: unknown): unknown[];
}

/**
 * Create an asynchronous "queue", list of functions to be invoked in parallel, but not necessarily returned in order
 * @return {Queue} The newly generated "queue"
 */
function queue(): QueueInstance {
  const tasks: unknown[] = [];
  let started = 0;
  let remaining = 0; // number of tasks not yet finished
  let completeQueue: (tasks: unknown[]) => void = noop;
  let complete = false;
  let err: unknown;

  // By default, wait until the next tick,
  // if no catch was set, throw to console.
  const defaultFail = (e: unknown): void => {
    err = e;
    setTimeout(() => {
      if (err !== undefined && err !== null) {
        log('Uncaught error (of queue)', err);
      }
    }, 1);
  };
  let failed: (e: unknown) => void = defaultFail;

  function createResolve(i: number): (r: unknown) => void {
    return (r: unknown) => {
      tasks[i] = r;
      remaining -= 1;
      if (!remaining && completeQueue !== noop) {
        complete = true;
        completeQueue(tasks);
      }
    };
  }

  function abort(msg: unknown): unknown[] {
    // reset tasks
    completeQueue = noop;

    // notify catch
    failed(msg);
    // return unfinished work
    return tasks;
  }

  function pop(): void {
    const length = tasks.length;
    for (; started < length; started++) {
      const task = tasks[started] as (
        resolve: (r: unknown) => void,
        reject: (msg: unknown) => unknown[]
      ) => void;

      try {
        task.call(null, createResolve(started), abort);
      } catch (e) {
        abort(e);
      }
    }
  }

  const q: QueueInstance = {
    /**
     * Defer a function that may or may not run asynchronously.
     *
     * First parameter should be the function to execute with subsequent
     * parameters being passed as arguments to that function
     */
    defer(fn: unknown): QueueInstance {
      if (
        typeof fn === 'object' &&
        fn !== null &&
        'then' in fn &&
        'catch' in fn
      ) {
        const defer = fn as {
          then: (cb: unknown) => { catch: (cb: unknown) => unknown };
        };
        fn = (resolve: unknown, reject: unknown) => {
          defer.then(resolve).catch(reject);
        };
      }
      funcGuard(fn);
      if (err !== undefined) {
        return q;
      } else if (complete) {
        throw new Error('Queue already completed');
      }

      tasks.push(fn);
      ++remaining;
      pop();
      return q;
    },

    /**
     * The callback to execute once all "deferred" functions have completed.  Will only be invoked once.
     * @param  {Function} f The callback, receives an array of the return/callbacked
     * values of each of the "deferred" functions
     */
    then(fn: (tasks: unknown[]) => void): QueueInstance {
      funcGuard(fn);
      if (completeQueue !== noop) {
        throw new Error('queue `then` already set');
      }
      if (!err) {
        completeQueue = fn;
        if (!remaining) {
          complete = true;
          completeQueue(tasks);
        }
      }
      return q;
    },

    catch: function (fn: (err: unknown) => void): QueueInstance {
      funcGuard(fn);
      if (failed !== defaultFail) {
        throw new Error('queue `catch` already set');
      }
      if (!err) {
        failed = fn;
      } else {
        fn(err);
        err = null;
      }
      return q;
    },
    /**
     * Abort the "queue" and prevent `then` function from firing
     * @param  {Function} fn The callback to execute; receives an array of the results which have completed
     */
    abort: abort
  };
  return q;
}

export default queue;
