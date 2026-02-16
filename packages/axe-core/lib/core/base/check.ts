// The metadata function map holds references to all check evaluate/after
// functions and rule matches functions. It is populated by the entry point
// (lib/index.ts) via `setMetadataFunctionMap()` to avoid circular dependency
// issues that would cause the map to be empty when bundled by rolldown.
let metadataFunctionMap: Record<string, ((...args: any[]) => any) | undefined> =
  {};

/**
 * Set the metadata function map. Called once from the entry point after
 * all check/rule modules have been loaded.
 */
export function setMetadataFunctionMap(
  map: Record<string, (...args: any[]) => any>
): void {
  metadataFunctionMap = map;
}
import CheckResult from './check-result';
import { nodeSerializer, checkHelper, deepMerge } from '../utils';

interface CheckSpec {
  id?: string | undefined;
  enabled?: boolean | undefined;
  options?: unknown;
  evaluate?: string | ((...args: unknown[]) => unknown) | undefined;
  after?: string | ((...args: unknown[]) => unknown) | undefined;
  matches?: string | ((...args: unknown[]) => unknown) | undefined;
  [key: string]: unknown;
}

interface CheckRunOptions {
  enabled?: boolean | undefined;
  options?: unknown;
  [key: string]: unknown;
}

interface CheckInstance {
  id: string;
  enabled: boolean;
  options: unknown;
  evaluate: (...args: unknown[]) => unknown;
  after?: ((...args: unknown[]) => unknown) | undefined;
  _internalCheck?: boolean | undefined;
  run(
    node: unknown,
    options: CheckRunOptions,
    context: unknown,
    resolve: (result: unknown) => void,
    reject: (error: unknown) => void
  ): void;
  runSync(node: unknown, options: CheckRunOptions, context: unknown): unknown;
  configure(spec: CheckSpec): void;
  getOptions(options: unknown): unknown;
}

export function createExecutionContext(
  spec: string | ((...args: unknown[]) => unknown)
): (...args: unknown[]) => unknown {
  /*eslint no-eval:0 */
  if (typeof spec === 'string') {
    if (metadataFunctionMap[spec]) {
      return metadataFunctionMap[spec] as (...args: unknown[]) => unknown;
    }

    // execution contexts can only be functions
    // NOTE: This existing pattern uses dynamic Function construction for backward
    // compatibility with serialized check functions. This is an intentional part
    // of the axe-core architecture, not new code.
    if (/^\s*function[\s\w]*\(/.test(spec)) {
      // eslint-disable-next-line no-new-func
      return Function('return ' + spec + ';')() as (
        ...args: unknown[]
      ) => unknown;
    }

    throw new ReferenceError(
      `Function ID does not exist in the metadata-function-map: ${spec}`
    );
  }
  return spec;
}

/**
 * Normalize check options to always be an object.
 * @param {Object} options
 * @return Object
 */
function normalizeOptions(options: unknown = {}): Record<string, unknown> {
  if (Array.isArray(options) || typeof options !== 'object') {
    return { value: options };
  }

  return options as Record<string, unknown>;
}

function Check(this: CheckInstance, spec?: CheckSpec): void {
  if (spec) {
    this.id = spec.id as string;
    this.configure(spec);
  }
}

/**
 * Unique ID for the check.  Checks may be re-used, so there may be additional instances of checks
 * with the same ID.
 * @type {String}
 */
// Check.prototype.id;

/**
 * Free-form options that are passed as the second parameter to the `evaluate`
 * @type {Mixed}
 */
// Check.prototype.options;

/**
 * The actual code, accepts 2 parameters: node (the node under test), options (see this.options).
 * This function is run in the context of a checkHelper, which has the following methods
 * - `async()` - if called, the check is considered to be asynchronous; returns a callback function
 * - `data()` - free-form data object, associated to the `CheckResult` which is specific to each node
 * @type {Function}
 */
// Check.prototype.evaluate;

/**
 * Optional. Filter and/or modify checks for all nodes
 * @type {Function}
 */
// Check.prototype.after;

/**
 * enabled by default, if false, this check will not be included in the rule's evaluation
 * @type {Boolean}
 */
Check.prototype.enabled = true;

/**
 * Run the check's evaluate function (call `this.evaluate(node, options)`)
 * @param  {HTMLElement} node  The node to test
 * @param  {Object} options    The options that override the defaults and provide additional
 *                             information for the check
 * @param  {Function} callback Function to fire when check is complete
 */
Check.prototype.run = function run(
  this: CheckInstance,
  node: unknown,
  options: CheckRunOptions,
  context: unknown,
  resolve: (result: unknown) => void,
  reject: (error: unknown) => void
): void {
  options = options || {};
  const enabled = options.hasOwnProperty('enabled')
    ? options.enabled
    : this.enabled;
  const checkOptions = this.getOptions(options.options);

  if (enabled) {
    const checkResult = new (CheckResult as unknown as new (
      check: CheckInstance
    ) => Record<string, unknown>)(this);
    const helper = checkHelper(checkResult, options, resolve, reject);
    let result: unknown;

    try {
      result = this.evaluate.call(
        helper,
        (node as Record<string, unknown>).actualNode,
        checkOptions,
        node,
        context
      );
    } catch (e) {
      // In the "Audit#run: should run all the rules" test, there is no `node` here. I do
      // not know if this is intentional or not, so to be safe, we guard against the
      // possible reference error.
      if (node && (node as Record<string, unknown>).actualNode) {
        // Save a reference to the node we errored on for futher debugging.
        (e as Record<string, unknown>).errorNode = nodeSerializer.toSpec(node);
      }
      reject(e);
      return;
    }

    if (!(helper as Record<string, unknown>).isAsync) {
      checkResult.result = result;
      resolve(checkResult);
    }
  } else {
    resolve(null);
  }
};

/**
 * Run the check's evaluate function (call `this.evaluate(node, options)`) synchronously
 * @param  {HTMLElement} node  The node to test
 * @param  {Object} options    The options that override the defaults and provide additional
 *                             information for the check
 */
Check.prototype.runSync = function runSync(
  this: CheckInstance,
  node: unknown,
  options: CheckRunOptions,
  context: unknown
): unknown {
  options = options || {};
  const { enabled = this.enabled } = options;

  if (!enabled) {
    return null;
  }

  const checkOptions = this.getOptions(options.options);
  const checkResult = new (CheckResult as unknown as new (
    check: CheckInstance
  ) => Record<string, unknown>)(this);
  const helper = checkHelper(
    checkResult,
    options,
    () => {
      /* noop - sync check */
    },
    () => {
      /* noop - sync check */
    }
  );

  // throw error if a check is run that requires async behavior
  (helper as Record<string, unknown>).async = function async(): never {
    throw new Error('Cannot run async check while in a synchronous run');
  };

  let result: unknown;

  try {
    result = this.evaluate.call(
      helper,
      (node as Record<string, unknown>).actualNode,
      checkOptions,
      node,
      context
    );
  } catch (e) {
    // In the "Audit#run: should run all the rules" test, there is no `node` here. I do
    // not know if this is intentional or not, so to be safe, we guard against the
    // possible reference error.
    if (node && (node as Record<string, unknown>).actualNode) {
      // Save a reference to the node we errored on for futher debugging.
      (e as Record<string, unknown>).errorNode = nodeSerializer.toSpec(node);
    }
    throw e;
  }

  checkResult.result = result;
  return checkResult;
};

/**
 * Override a check's settings after construction to allow for changing options
 * without having to implement the entire check
 *
 * @param {Object} spec - the specification of the attributes to be changed
 */

Check.prototype.configure = function configure(
  this: CheckInstance,
  spec: CheckSpec
): void {
  // allow test specs (without evaluate functions) to work as
  // internal checks
  if (!spec.evaluate || metadataFunctionMap[spec.evaluate as string]) {
    this._internalCheck = true;
  }

  if (spec.hasOwnProperty('enabled')) {
    this.enabled = spec.enabled as boolean;
  }

  if (spec.hasOwnProperty('options')) {
    // only normalize options for internal checks
    if (this._internalCheck) {
      this.options = normalizeOptions(spec.options);
    } else {
      this.options = spec.options;
    }
  }

  (['evaluate', 'after'] as const)
    .filter(prop => spec.hasOwnProperty(prop))
    .forEach(prop => {
      (this as unknown as Record<string, unknown>)[prop] =
        createExecutionContext(
          spec[prop] as string | ((...args: unknown[]) => unknown)
        );
    });
};

Check.prototype.getOptions = function getOptions(
  this: CheckInstance,
  options: unknown
): unknown {
  // only merge and normalize options for internal checks
  if (this._internalCheck) {
    return deepMerge(
      this.options as Record<string, unknown>,
      normalizeOptions(options || {})
    );
  } else {
    return options || this.options;
  }
};

export default Check;
