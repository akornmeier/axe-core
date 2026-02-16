import { createExecutionContext } from './check';
import RuleResult from './rule-result';
import {
  performanceTimer,
  getAllChecks,
  getCheckOption,
  queue,
  DqElement,
  select,
  assert,
  RuleError
} from '../utils';
import { isVisibleToScreenReaders } from '../../commons/dom';
import constants from '../constants';
import log from '../log';

interface RuleSpec {
  id: string;
  selector?: string | undefined;
  impact?: string | undefined;
  excludeHidden?: boolean | undefined;
  enabled?: boolean | undefined;
  pageLevel?: boolean | undefined;
  reviewOnFail?: boolean | undefined;
  any?: unknown[] | undefined;
  all?: unknown[] | undefined;
  none?: unknown[] | undefined;
  tags?: string[] | undefined;
  preload?: boolean | undefined;
  actIds?: string[] | undefined;
  matches?: string | ((...args: unknown[]) => unknown) | undefined;
  metadata?: Record<string, unknown> | undefined;
  [key: string]: unknown;
}

interface AuditLike {
  checks: Record<string, unknown>;
  [key: string]: unknown;
}

interface RuleRunOptions {
  performanceTimer?: boolean | undefined;
  debug?: boolean | undefined;
  [key: string]: unknown;
}

interface CheckResultLike {
  id: string;
  result?: unknown;
  filtered?: boolean | undefined;
  node?: unknown;
  [key: string]: unknown;
}

interface NodeResultLike {
  any: CheckResultLike[];
  all: CheckResultLike[];
  none: CheckResultLike[];
  node?: unknown;
  [key: string]: unknown;
}

interface RuleResultLike {
  id: string;
  result: string;
  pageLevel: boolean;
  impact: string | null;
  nodes: NodeResultLike[];
  [key: string]: unknown;
}

interface RuleInstance {
  _audit: AuditLike;
  id: string;
  selector: string;
  impact?: string | undefined;
  excludeHidden: boolean;
  enabled: boolean;
  pageLevel: boolean;
  reviewOnFail: boolean;
  any: unknown[];
  all: unknown[];
  none: unknown[];
  tags: string[];
  preload: boolean;
  actIds?: string[] | undefined;
  matches: (...args: unknown[]) => boolean;
  gather(context: unknown, options?: RuleRunOptions): unknown[];
  runChecks(
    type: string,
    node: unknown,
    options: RuleRunOptions,
    context: unknown,
    resolve: (result: unknown) => void,
    reject: (error: unknown) => void
  ): void;
  runChecksSync(
    type: string,
    node: unknown,
    options: RuleRunOptions,
    context: unknown
  ): unknown;
  run(
    context: unknown,
    options: RuleRunOptions,
    resolve: (result: unknown) => void,
    reject: (error: unknown) => void
  ): void;
  runSync(context: unknown, options: RuleRunOptions): unknown;
  after(result: RuleResultLike, options: RuleRunOptions): RuleResultLike;
  configure(spec: RuleSpec): void;
  gatherAndMatchNodes(context: unknown, options: RuleRunOptions): unknown[];
  _trackPerformance(): void;
  _logGatherPerformance(nodes: unknown[]): void;
  _logRulePerformance(): void;
  _markStart: string;
  _markEnd: string;
  _markChecksStart: string;
  _markChecksEnd: string;
}

export default function Rule(
  this: RuleInstance,
  spec: RuleSpec,
  parentAudit: AuditLike
): void {
  this._audit = parentAudit;

  /**
   * The code, or string ID of the rule
   * @type {String}
   */
  this.id = spec.id;

  /**
   * Selector that this rule applies to
   * @type {String}
   */
  this.selector = spec.selector || '*';

  /**
   * Impact of the rule (optional)
   * @type {"minor" | "moderate" | "serious" | "critical"}
   */
  if (spec.impact) {
    assert(
      constants.impact.includes(spec.impact),
      `Impact ${spec.impact} is not a valid impact`
    );
    this.impact = spec.impact;
  }

  /**
   * Whether to exclude hiddden elements form analysis.  Defaults to true.
   * @type {Boolean}
   */
  this.excludeHidden =
    typeof spec.excludeHidden === 'boolean' ? spec.excludeHidden : true;

  /**
   * Flag to enable or disable rule
   * @type {Boolean}
   */
  this.enabled = typeof spec.enabled === 'boolean' ? spec.enabled : true;

  /**
   * Denotes if the rule should be run if Context is not an entire page AND whether
   * the Rule should be satisified regardless of Node
   * @type {Boolean}
   */
  this.pageLevel = typeof spec.pageLevel === 'boolean' ? spec.pageLevel : false;

  /**
   * Flag to force the rule to return as needs review rather than a violation if any of the checks fail.
   * @type {Boolean}
   */
  this.reviewOnFail =
    typeof spec.reviewOnFail === 'boolean' ? spec.reviewOnFail : false;

  /**
   * Checks that any may return true to satisfy rule
   * @type {Array}
   */
  this.any = spec.any || [];

  /**
   * Checks that must all return true to satisfy rule
   * @type {Array}
   */
  this.all = spec.all || [];

  /**
   * Checks that none may return true to satisfy rule
   * @type {Array}
   */
  this.none = spec.none || [];

  /**
   * Tags associated to this rule
   * @type {Array}
   */
  this.tags = spec.tags || [];

  /**
   * Preload necessary for this rule
   */
  this.preload = spec.preload ? true : false;

  /**
   * IDs of ACT rules the axe-core rule maps to
   * @type {Array|undefined}
   */
  this.actIds = spec.actIds;

  if (spec.matches) {
    /**
     * Optional function to test if rule should be run against a node, overrides Rule#matches
     * @type {Function}
     */
    this.matches = createExecutionContext(spec.matches) as (
      ...args: unknown[]
    ) => boolean;
  }
}

/**
 * Optionally test each node against a `matches` function to determine if the rule should run against
 * a given node.  Defaults to `true`.
 * @return {Boolean}    Whether the rule should run
 */
Rule.prototype.matches = function matches(): boolean {
  return true;
};

/**
 * Selects `HTMLElement`s based on configured selector
 * @param  {Context} context The resolved Context object
 * @param  {Mixed}   options Options specific to this rule
 * @return {Array}           All matching `HTMLElement`s
 */
Rule.prototype.gather = function gather(
  this: RuleInstance,
  context: unknown,
  options: RuleRunOptions = {}
): unknown[] {
  const markStart = 'mark_gather_start_' + this.id;
  const markEnd = 'mark_gather_end_' + this.id;
  const markHiddenStart = 'mark_isVisibleToScreenReaders_start_' + this.id;
  const markHiddenEnd = 'mark_isVisibleToScreenReaders_end_' + this.id;

  if (options.performanceTimer) {
    performanceTimer.mark(markStart);
  }

  let elements = select(this.selector, context as Record<string, unknown>);
  if (this.excludeHidden) {
    if (options.performanceTimer) {
      performanceTimer.mark(markHiddenStart);
    }

    elements = elements.filter((element: unknown) => {
      return isVisibleToScreenReaders(element);
    });

    if (options.performanceTimer) {
      performanceTimer.mark(markHiddenEnd);
      performanceTimer.measure(
        'rule_' + this.id + '#gather_axe.utils.isVisibleToScreenReaders',
        markHiddenStart,
        markHiddenEnd
      );
    }
  }

  if (options.performanceTimer) {
    performanceTimer.mark(markEnd);
    performanceTimer.measure('rule_' + this.id + '#gather', markStart, markEnd);
  }

  return elements;
};

Rule.prototype.runChecks = function runChecks(
  this: RuleInstance,
  type: string,
  node: unknown,
  options: RuleRunOptions,
  context: unknown,
  resolve: (result: unknown) => void,
  reject: (error: unknown) => void
): void {
  const self = this;

  const checkQueue = queue();

  ((this as unknown as Record<string, unknown[]>)[type] ?? []).forEach(
    (c: unknown) => {
      const check = self._audit.checks[
        ((c as Record<string, unknown>).id as string) || (c as string)
      ] as Record<string, unknown>;
      const option = getCheckOption(check, self.id, options);
      checkQueue.defer(
        (res: (result: unknown) => void, rej: (error: unknown) => void) => {
          (check.run as (...args: unknown[]) => void)(
            node,
            option,
            context,
            res,
            (error: unknown) => {
              rej(
                new RuleError({
                  ruleId: self.id,
                  method: `${check.id}#evaluate`,
                  errorNode: new DqElement(node),
                  error: error as Error
                })
              );
            }
          );
        }
      );
    }
  );

  checkQueue
    .then((results: unknown[]) => {
      results = results.filter((check: unknown) => check);
      resolve({ type: type, results: results });
    })
    .catch(reject);
};

/**
 * Run a check for a rule synchronously.
 */
Rule.prototype.runChecksSync = function runChecksSync(
  this: RuleInstance,
  type: string,
  node: unknown,
  options: RuleRunOptions,
  context: unknown
): { type: string; results: unknown[] } {
  const self = this;
  let results: unknown[] = [];

  ((this as unknown as Record<string, unknown[]>)[type] ?? []).forEach(
    (c: unknown) => {
      const check = self._audit.checks[
        ((c as Record<string, unknown>).id as string) || (c as string)
      ] as Record<string, unknown>;
      const option = getCheckOption(check, self.id, options);
      results.push(
        (check.runSync as (...args: unknown[]) => unknown)(
          node,
          option,
          context
        )
      );
    }
  );

  results = results.filter((check: unknown) => check);

  return { type: type, results: results };
};

/**
 * Runs the Rule's `evaluate` function
 * @param  {Context}   context  The resolved Context object
 * @param  {Mixed}   options  Options specific to this rule
 * @param  {Function} callback Function to call when evaluate is complete; receives a RuleResult instance
 */
Rule.prototype.run = function run(
  this: RuleInstance,
  context: unknown,
  options: RuleRunOptions = {},
  resolve: (result: unknown) => void,
  reject: (error: unknown) => void
): void {
  if (options.performanceTimer) {
    this._trackPerformance();
  }

  const q = queue();
  const ruleResult = new (RuleResult as unknown as new (
    rule: RuleInstance
  ) => RuleResultLike)(this);
  let nodes: unknown[];

  try {
    // Matches throws an error when it lacks support for document methods
    nodes = this.gatherAndMatchNodes(context, options);
  } catch (error) {
    reject(error);
    return;
  }

  if (options.performanceTimer) {
    this._logGatherPerformance(nodes);
  }

  nodes.forEach((node: unknown) => {
    q.defer(
      (
        resolveNode: (result: unknown) => void,
        rejectNode: (error: unknown) => void
      ) => {
        const checkQueue = queue();

        (['any', 'all', 'none'] as const).forEach((type: string) => {
          checkQueue.defer(
            (res: (result: unknown) => void, rej: (error: unknown) => void) => {
              this.runChecks(type, node, options, context, res, rej);
            }
          );
        });

        checkQueue
          .then((results: unknown[]) => {
            const result = getResult(results) as
              | NodeResultLike
              | null
              | undefined;
            if (result) {
              result.node = new DqElement(node);
              ruleResult.nodes.push(result);

              // mark rule as incomplete rather than failure for rules with reviewOnFail
              if (this.reviewOnFail) {
                (['any', 'all'] as const).forEach((type: string) => {
                  (
                    (result as unknown as Record<string, CheckResultLike[]>)[
                      type
                    ] ?? []
                  ).forEach((checkResult: CheckResultLike) => {
                    if (checkResult.result === false) {
                      checkResult.result = undefined;
                    }
                  });
                });

                result.none.forEach((checkResult: CheckResultLike) => {
                  if (checkResult.result === true) {
                    checkResult.result = undefined;
                  }
                });
              }
            }
            resolveNode(undefined);
          })
          .catch((err: unknown) => rejectNode(err));
      }
    );
  });

  q.then(() => {
    if (options.performanceTimer) {
      this._logRulePerformance();
    }
    // Defer the rule's execution to prevent "unresponsive script" warnings.
    // See https://github.com/dequelabs/axe-core/pull/1172 for discussion and details.
    setTimeout(() => {
      resolve(ruleResult);
    }, 0);
  }).catch((error: unknown) => {
    if (options.performanceTimer) {
      this._logRulePerformance();
    }
    reject(error);
  });
};

/**
 * Runs the Rule's `evaluate` function synchronously
 * @param  {Context}   context  The resolved Context object
 * @param  {Mixed}   options  Options specific to this rule
 */
Rule.prototype.runSync = function runSync(
  this: RuleInstance,
  context: unknown,
  options: RuleRunOptions = {}
): RuleResultLike {
  if (options.performanceTimer) {
    this._trackPerformance();
  }

  const ruleResult = new (RuleResult as unknown as new (
    rule: RuleInstance
  ) => RuleResultLike)(this);
  const nodes = this.gatherAndMatchNodes(context, options);
  if (options.performanceTimer) {
    this._logGatherPerformance(nodes);
  }

  nodes.forEach((node: unknown) => {
    const results: unknown[] = [];
    (['any', 'all', 'none'] as const).forEach((type: string) => {
      results.push(this.runChecksSync(type, node, options, context));
    });

    const result = getResult(results) as NodeResultLike | null | undefined;
    if (result) {
      result.node = (node as Record<string, unknown>).actualNode
        ? new DqElement(node)
        : null;
      ruleResult.nodes.push(result);

      // mark rule as incomplete rather than failure for rules with reviewOnFail
      if (this.reviewOnFail) {
        (['any', 'all'] as const).forEach((type: string) => {
          (
            (result as unknown as Record<string, CheckResultLike[]>)[type] ?? []
          ).forEach((checkResult: CheckResultLike) => {
            if (checkResult.result === false) {
              checkResult.result = undefined;
            }
          });
        });

        result.none.forEach((checkResult: CheckResultLike) => {
          if (checkResult.result === true) {
            checkResult.result = undefined;
          }
        });
      }
    }
  });

  if (options.performanceTimer) {
    this._logRulePerformance();
  }

  return ruleResult;
};

/**
 * Add performance tracking properties to the rule
 * @private
 */
Rule.prototype._trackPerformance = function _trackPerformance(
  this: RuleInstance
): void {
  this._markStart = 'mark_rule_start_' + this.id;
  this._markEnd = 'mark_rule_end_' + this.id;
  this._markChecksStart = 'mark_runchecks_start_' + this.id;
  this._markChecksEnd = 'mark_runchecks_end_' + this.id;
};

/**
 * Log performance of rule.gather
 * @private
 * @param {Rule} rule The rule to log
 * @param {Array} nodes Result of rule.gather
 */
Rule.prototype._logGatherPerformance = function _logGatherPerformance(
  this: RuleInstance,
  nodes: unknown[]
): void {
  log(
    `gather for ${this.id} (${nodes.length} nodes): ${performanceTimer.timeElapsed()}ms`
  );
  performanceTimer.mark(this._markChecksStart);
};

/**
 * Log performance of the rule
 * @private
 * @param {Rule} rule The rule to log
 */
Rule.prototype._logRulePerformance = function _logRulePerformance(
  this: RuleInstance
): void {
  performanceTimer.mark(this._markChecksEnd);
  performanceTimer.mark(this._markEnd);
  performanceTimer.measure(
    'runchecks_' + this.id,
    this._markChecksStart,
    this._markChecksEnd
  );

  performanceTimer.measure('rule_' + this.id, this._markStart, this._markEnd);
};

/**
 * Process the results of each check and return the result if a check
 * has a result
 * @private
 * @param {Array} results  Array of each check result
 * @returns {Object|null}
 */
function getResult(
  results: unknown[]
): Record<string, unknown> | null | undefined {
  if (results.length) {
    let hasResults = false;
    const result: Record<string, unknown> = {};
    results.forEach((r: unknown) => {
      const typedR = r as { type: string; results: unknown[] };
      const res = typedR.results.filter((_result: unknown) => _result);
      result[typedR.type] = res;
      if (res.length) {
        hasResults = true;
      }
    });

    if (hasResults) {
      return result;
    }

    return null;
  }
}

/**
 * Selects `HTMLElement`s based on configured selector and filters them based on
 * the rules matches function
 * @param  {Rule} rule The rule to check for after checks
 * @param  {Context} context The resolved Context object
 * @param  {Mixed}   options Options specific to this rule
 * @return {Array}           All matching `HTMLElement`s
 */
Rule.prototype.gatherAndMatchNodes = function gatherAndMatchNodes(
  this: RuleInstance,
  context: unknown,
  options: RuleRunOptions
): unknown[] {
  const markMatchesStart = 'mark_matches_start_' + this.id;
  const markMatchesEnd = 'mark_matches_end_' + this.id;

  let nodes = this.gather(context, options);

  if (options.performanceTimer) {
    performanceTimer.mark(markMatchesStart);
  }

  nodes = nodes.filter((node: unknown) => {
    try {
      return this.matches(
        (node as Record<string, unknown>).actualNode,
        node,
        context
      );
    } catch (error) {
      throw new RuleError({
        ruleId: this.id,
        method: `#matches`,
        errorNode: new DqElement(node),
        error: error as Error
      });
    }
  });

  if (options.performanceTimer) {
    performanceTimer.mark(markMatchesEnd);
    performanceTimer.measure(
      'rule_' + this.id + '#matches',
      markMatchesStart,
      markMatchesEnd
    );
  }

  return nodes;
};

/**
 * Iterates the rule's Checks looking for ones that have an after function
 * @private
 * @param  {Rule} rule The rule to check for after checks
 * @return {Array}      Checks that have an after function
 */
function findAfterChecks(rule: RuleInstance): Record<string, unknown>[] {
  return getAllChecks(rule as unknown as Record<string, unknown>)
    .map((c: unknown) => {
      const check = rule._audit.checks[
        ((c as Record<string, unknown>).id as string) || (c as string)
      ] as Record<string, unknown>;
      return check && typeof check.after === 'function' ? check : null;
    })
    .filter(Boolean) as Record<string, unknown>[];
}

/**
 * Finds and collates all results for a given Check on a specific Rule
 * @private
 * @param  {Array} nodes RuleResult#nodes; array of 'detail' objects
 * @param  {String} checkID The ID of the Check to find
 * @return {Array}         Matching CheckResults
 */
function findCheckResults(
  nodes: NodeResultLike[],
  checkID: string
): CheckResultLike[] {
  const checkResults: CheckResultLike[] = [];
  nodes.forEach((nodeResult: NodeResultLike) => {
    const checks = getAllChecks(nodeResult);
    checks.forEach((checkResult: unknown) => {
      const typedCheckResult = checkResult as CheckResultLike;
      if (typedCheckResult.id === checkID) {
        typedCheckResult.node = nodeResult.node;
        checkResults.push(typedCheckResult);
      }
    });
  });
  return checkResults;
}

function filterChecks(checks: CheckResultLike[]): CheckResultLike[] {
  return checks.filter((check: CheckResultLike) => {
    return check.filtered !== true;
  });
}

function sanitizeNodes(result: RuleResultLike): NodeResultLike[] {
  const checkTypes: ('any' | 'all' | 'none')[] = ['any', 'all', 'none'];

  let nodes = result.nodes.filter((detail: NodeResultLike) => {
    let length = 0;
    checkTypes.forEach((type: 'any' | 'all' | 'none') => {
      detail[type] = filterChecks(detail[type]);
      length += detail[type].length;
    });
    return length > 0;
  });

  if (result.pageLevel && nodes.length) {
    nodes = [
      nodes.reduce((a: NodeResultLike, b: NodeResultLike) => {
        if (a) {
          checkTypes.forEach((type: 'any' | 'all' | 'none') => {
            a[type].push.apply(a[type], b[type]);
          });
          return a;
        }
        return a;
      })
    ];
  }
  return nodes;
}

/**
 * Runs all of the Rule's Check#after methods
 * @param  {RuleResult} result  The "pre-after" RuleResult
 * @param  {Mixed} options Options specific to the rule
 * @return {RuleResult}         The RuleResult as filtered by after functions
 */
Rule.prototype.after = function after(
  this: RuleInstance,
  result: RuleResultLike,
  options: RuleRunOptions
): RuleResultLike {
  const afterChecks = findAfterChecks(this);
  afterChecks.forEach((check: Record<string, unknown>) => {
    const beforeResults = findCheckResults(result.nodes, check.id as string);
    const checkOption = getCheckOption(check, this.id, options);
    let afterResults: CheckResultLike[];
    try {
      afterResults = (
        check.after as (
          results: CheckResultLike[],
          options: unknown
        ) => CheckResultLike[]
      )(beforeResults, (checkOption as Record<string, unknown>).options);
    } catch (error) {
      throw new RuleError({
        ruleId: this.id,
        method: `${check.id}#after`,
        errorNode: result.nodes?.[0]?.node,
        error: error as Error
      });
    }

    if (this.reviewOnFail) {
      afterResults.forEach((checkResult: CheckResultLike) => {
        const changeAnyAllResults =
          (this.any.includes(checkResult.id) ||
            this.all.includes(checkResult.id)) &&
          checkResult.result === false;
        const changeNoneResult =
          this.none.includes(checkResult.id) && checkResult.result === true;

        if (changeAnyAllResults || changeNoneResult) {
          checkResult.result = undefined;
        }
      });
    }

    beforeResults.forEach((item: CheckResultLike) => {
      // only add the node property for the check.after so we can
      // look at which iframe a check result came from, but we don't
      // want it for the final results object
      delete item.node;
      if (afterResults.indexOf(item) === -1) {
        item.filtered = true;
      }
    });
  });

  result.nodes = sanitizeNodes(result);
  return result;
};

/**
 * Reconfigure a rule after it has been added
 * @param {Object} spec - the attributes to be reconfigured
 */
Rule.prototype.configure = function configure(
  this: RuleInstance,
  spec: RuleSpec
): void {
  /*eslint no-eval:0 */

  if (spec.hasOwnProperty('selector')) {
    this.selector = spec.selector as string;
  }

  if (spec.hasOwnProperty('excludeHidden')) {
    this.excludeHidden =
      typeof spec.excludeHidden === 'boolean' ? spec.excludeHidden : true;
  }

  if (spec.hasOwnProperty('enabled')) {
    this.enabled = typeof spec.enabled === 'boolean' ? spec.enabled : true;
  }

  if (spec.hasOwnProperty('pageLevel')) {
    this.pageLevel =
      typeof spec.pageLevel === 'boolean' ? spec.pageLevel : false;
  }

  if (spec.hasOwnProperty('reviewOnFail')) {
    this.reviewOnFail =
      typeof spec.reviewOnFail === 'boolean' ? spec.reviewOnFail : false;
  }

  if (spec.hasOwnProperty('any')) {
    this.any = spec.any as unknown[];
  }

  if (spec.hasOwnProperty('all')) {
    this.all = spec.all as unknown[];
  }

  if (spec.hasOwnProperty('none')) {
    this.none = spec.none as unknown[];
  }

  if (spec.hasOwnProperty('tags')) {
    this.tags = spec.tags as string[];
  }

  if (spec.hasOwnProperty('actIds')) {
    this.actIds = spec.actIds;
  }

  if (spec.hasOwnProperty('matches')) {
    this.matches = createExecutionContext(
      spec.matches as string | ((...args: unknown[]) => unknown)
    ) as (...args: unknown[]) => boolean;
  }

  if (spec.impact) {
    assert(
      constants.impact.includes(spec.impact),
      `Impact ${spec.impact} is not a valid impact`
    );
    this.impact = spec.impact;
  }
};
