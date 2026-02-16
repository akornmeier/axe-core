import Rule from './rule';
import Check from './check';
import standards from '../../standards';
import RuleResult from './rule-result';
import {
  clone,
  DqElement,
  queue,
  preload,
  findBy,
  ruleShouldRun,
  performanceTimer,
  serializeError,
  normalizeRunOptions
} from '../utils';
import { doT } from '../imports';
import constants from '../constants';

const dotRegex = /\{\{.+?\}\}/g;

interface RuleLike {
  id: string;
  preload: boolean;
  run(
    context: unknown,
    options: unknown,
    resolve: (result: unknown) => void,
    reject: (error: unknown) => void
  ): void;
  after(result: unknown, options: unknown): unknown;
  configure(spec: unknown): void;
  [key: string]: unknown;
}

interface CheckLike {
  id: string;
  configure(spec: unknown): void;
  [key: string]: unknown;
}

interface AuditConfig {
  lang?: string | undefined;
  reporter?: string | null | undefined;
  rules?: unknown[] | undefined;
  checks?: unknown[] | undefined;
  data?:
    | {
        checks?: Record<string, unknown> | undefined;
        rules?: Record<string, unknown> | undefined;
        failureSummaries?: Record<string, unknown> | undefined;
        incompleteFallbackMessage?: string | unknown | undefined;
      }
    | undefined;
  noHtml?: boolean | undefined;
  allowedOrigins?: string[] | undefined;
  commons?: unknown;
  [key: string]: unknown;
}

interface AuditData {
  checks: Record<string, Record<string, unknown>>;
  rules: Record<string, Record<string, unknown>>;
  failureSummaries: Record<string, Record<string, unknown>>;
  incompleteFallbackMessage: string | ((...args: unknown[]) => unknown);
}

interface LocaleObject {
  checks?: Record<string, unknown> | undefined;
  rules?: Record<string, unknown> | undefined;
  failureSummaries?: Record<string, unknown> | undefined;
  incompleteFallbackMessage?: string | unknown | undefined;
  lang?: string | undefined;
}

interface BrandingObject {
  brand?: string | undefined;
  application?: string | undefined;
}

interface RuleResultLike {
  id: string;
  error?: unknown;
  nodes?: unknown[];
  [key: string]: unknown;
}

interface CommandLike {
  id: string;
  callback: (...args: unknown[]) => unknown;
}

interface RuleSplitResult {
  now: RuleLike[];
  later: RuleLike[];
}

/**
 * Constructor which holds configured rules and information about the document under test
 */
export default class Audit {
  lang: string;
  defaultConfig: AuditConfig | undefined;
  standards: unknown;
  _defaultLocale: LocaleObject | null;
  reporter: string | null | undefined;
  commands!: Record<string, (...args: unknown[]) => unknown>;
  rules!: RuleLike[];
  checks!: Record<string, CheckLike>;
  brand!: string;
  application!: string;
  tagExclude!: string[];
  noHtml: boolean | undefined;
  allowedOrigins!: string[];
  data!: AuditData;

  constructor(audit: AuditConfig | undefined) {
    // defaults
    this.lang = 'en';
    this.defaultConfig = audit;
    this.standards = standards;
    this._init();
    // A copy of the "default" locale. This will be set if the user
    // provides a new locale to `axe.configure()` and used to undo
    // changes in `axe.reset()`.
    this._defaultLocale = null;
  }
  /**
   * Build and set the previous locale. Will noop if a previous
   * locale was already set, as we want the ability to "reset"
   * to the default ("first") configuration.
   */
  _setDefaultLocale(): void {
    if (this._defaultLocale) {
      return;
    }
    const locale: LocaleObject = {
      checks: {},
      rules: {},
      failureSummaries: {},
      incompleteFallbackMessage: '',
      lang: this.lang
    };
    // XXX: unable to use `for-of` here, as doing so would
    // require us to polyfill `Symbol`.
    const checkIDs = Object.keys(this.data.checks);
    for (let i = 0; i < checkIDs.length; i++) {
      const id = checkIDs[i]!;
      const check = this.data.checks[id]!;
      const { pass, fail, incomplete } = (check as Record<string, unknown>)
        .messages as Record<string, unknown>;
      (locale.checks as Record<string, unknown>)[id] = {
        pass,
        fail,
        incomplete
      };
    }
    const ruleIDs = Object.keys(this.data.rules);
    for (let i = 0; i < ruleIDs.length; i++) {
      const id = ruleIDs[i]!;
      const rule = this.data.rules[id]!;
      const { description, help } = rule;
      (locale.rules as Record<string, unknown>)[id] = { description, help };
    }
    const failureSummaries = Object.keys(this.data.failureSummaries);
    for (let i = 0; i < failureSummaries.length; i++) {
      const type = failureSummaries[i]!;
      const failureSummary = this.data.failureSummaries[type]!;
      const { failureMessage } = failureSummary;
      (locale.failureSummaries as Record<string, unknown>)[type] = {
        failureMessage
      };
    }
    locale.incompleteFallbackMessage = this.data.incompleteFallbackMessage;
    this._defaultLocale = locale;
  }
  /**
   * Reset the locale to the "default".
   */
  _resetLocale(): void {
    // If the default locale has not already been set, we can exit early.
    const defaultLocale = this._defaultLocale;
    if (!defaultLocale) {
      return;
    }
    // Apply the default locale
    this.applyLocale(defaultLocale);
  }
  /**
   * Apply locale for the given `checks`.
   */
  _applyCheckLocale(checks: Record<string, unknown>): void {
    const keys = Object.keys(checks);
    for (let i = 0; i < keys.length; i++) {
      const id = keys[i]!;
      if (!this.data.checks[id]) {
        throw new Error(`Locale provided for unknown check: "${id}"`);
      }
      this.data.checks[id] = mergeCheckLocale(
        this.data.checks[id]!,
        checks[id] as Record<string, unknown>
      );
    }
  }
  /**
   * Apply locale for the given `rules`.
   */
  _applyRuleLocale(rules: Record<string, unknown>): void {
    const keys = Object.keys(rules);
    for (let i = 0; i < keys.length; i++) {
      const id = keys[i]!;
      if (!this.data.rules[id]) {
        throw new Error(`Locale provided for unknown rule: "${id}"`);
      }
      this.data.rules[id] = mergeRuleLocale(
        this.data.rules[id]!,
        rules[id] as Record<string, unknown>
      );
    }
  }
  /**
   * Apply locale for the given failureMessage
   */
  _applyFailureSummaries(messages: Record<string, unknown>): void {
    const keys = Object.keys(messages);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      if (!this.data.failureSummaries[key]) {
        throw new Error(`Locale provided for unknown failureMessage: "${key}"`);
      }
      this.data.failureSummaries[key] = mergeFailureMessage(
        this.data.failureSummaries[key]!,
        messages[key] as Record<string, unknown>
      );
    }
  }
  /**
   * Apply the given `locale`.
   *
   * @param {axe.Locale}
   */
  applyLocale(locale: LocaleObject): void {
    this._setDefaultLocale();
    if (locale.checks) {
      this._applyCheckLocale(locale.checks);
    }
    if (locale.rules) {
      this._applyRuleLocale(locale.rules);
    }
    if (locale.failureSummaries) {
      this._applyFailureSummaries(locale.failureSummaries);
    }
    if (locale.incompleteFallbackMessage) {
      this.data.incompleteFallbackMessage = mergeFallbackMessage(
        this.data.incompleteFallbackMessage,
        locale.incompleteFallbackMessage
      ) as string | ((...args: unknown[]) => unknown);
    }
    if (locale.lang) {
      this.lang = locale.lang;
    }
  }
  /**
   * Set the normalized allowed origins.
   *
   * @param {String[]}
   */
  setAllowedOrigins(allowedOrigins: string[]): void {
    const defaultOrigin = getDefaultOrigin();

    this.allowedOrigins = [];
    for (const origin of allowedOrigins) {
      if (origin === constants.allOrigins) {
        // No other origins needed. Set '*' and exit
        this.allowedOrigins = ['*'];
        return;
      } else if (origin !== constants.sameOrigin) {
        this.allowedOrigins.push(origin);
      } else if (defaultOrigin) {
        // sameOrigin, only if the default is known
        this.allowedOrigins.push(defaultOrigin);
      }
    }
  }
  /**
   * Initializes the rules and checks
   */
  _init(): void {
    const audit = getDefaultConfiguration(this.defaultConfig);
    this.lang = audit.lang || 'en';
    this.reporter = audit.reporter;
    this.commands = {};
    this.rules = [];
    this.checks = {};
    this.brand = 'axe';
    this.application = 'axeAPI';
    this.tagExclude = ['experimental', 'deprecated'];
    this.noHtml = audit.noHtml;
    this.allowedOrigins = audit.allowedOrigins as string[];
    unpackToObject(audit.rules as unknown[], this, 'addRule');
    unpackToObject(audit.checks as unknown[], this, 'addCheck');
    this.data = {} as AuditData;
    this.data.checks = ((audit.data && audit.data.checks) || {}) as Record<
      string,
      Record<string, unknown>
    >;
    this.data.rules = ((audit.data && audit.data.rules) || {}) as Record<
      string,
      Record<string, unknown>
    >;
    this.data.failureSummaries = ((audit.data && audit.data.failureSummaries) ||
      {}) as Record<string, Record<string, unknown>>;
    this.data.incompleteFallbackMessage = ((audit.data &&
      audit.data.incompleteFallbackMessage) ||
      '') as string;
    this._constructHelpUrls(); // create default helpUrls
  }
  /**
   * Adds a new command to the audit
   */
  registerCommand(command: CommandLike): void {
    this.commands[command.id] = command.callback;
  }
  /**
   * Adds a new rule to the Audit.  If a rule with specified ID already exists, it will be overridden
   * @param {Object} spec Rule specification object
   */
  addRule(spec: Record<string, unknown>): void {
    if (spec.metadata) {
      this.data.rules[spec.id as string] = spec.metadata as Record<
        string,
        unknown
      >;
    }
    const rule = this.getRule(spec.id as string);
    if (rule) {
      rule.configure(spec);
    } else {
      this.rules.push(
        new (Rule as unknown as new (spec: unknown, audit: Audit) => RuleLike)(
          spec,
          this
        )
      );
    }
  }
  /**
   * Adds a new check to the Audit.  If a Check with specified ID already exists, it will be
   * reconfigured
   *
   * @param {Object} spec Check specification object
   */
  addCheck(spec: Record<string, unknown>): void {
    /*eslint no-eval: 0 */

    const metadata = spec.metadata as Record<string, unknown> | undefined;
    if (typeof metadata === 'object') {
      this.data.checks[spec.id as string] = metadata;
      // Transform messages into functions:
      if (typeof metadata.messages === 'object') {
        Object.keys(metadata.messages as Record<string, unknown>)
          .filter(
            (prop: string) =>
              (metadata.messages as Record<string, unknown>).hasOwnProperty(
                prop
              ) &&
              typeof (metadata.messages as Record<string, unknown>)[prop] ===
                'string'
          )
          .forEach((prop: string) => {
            if (
              (
                (metadata.messages as Record<string, unknown>)[prop] as string
              ).indexOf('function') === 0
            ) {
              // NOTE: This existing pattern uses dynamic Function construction for backward
              // compatibility with serialized check message functions. This is an intentional
              // part of the axe-core architecture, not new code.
              // eslint-disable-next-line no-new-func
              (metadata.messages as Record<string, unknown>)[prop] = Function(
                'return ' +
                  (metadata.messages as Record<string, unknown>)[prop] +
                  ';'
              )();
            }
          });
      }
    }
    if (this.checks[spec.id as string] != null) {
      this.checks[spec.id as string]!.configure(spec);
    } else {
      this.checks[spec.id as string] = new (Check as unknown as new (
        spec: unknown
      ) => CheckLike)(spec);
    }
  }
  /**
   * Runs the Audit; which in turn should call `run` on each rule.
   * @async
   * @param  {Context}   context The scope definition/context for analysis (include/exclude)
   * @param  {Object}    options Options object to pass into rules and/or disable rules or checks
   * @param  {Function}  resolve Callback function to fire when audit is complete
   * @param  {Function}  reject  Callback function to fire when audit experiences an error
   */
  run(
    context: unknown,
    options: Record<string, unknown>,
    resolve: (results: unknown) => void,
    reject: (error: unknown) => void
  ): void {
    normalizeRunOptions(options);
    DqElement.setRunOptions(options);

    // TODO: es-modules_selectCache
    axe._selectCache = [];
    // get a list of rules to run NOW vs. LATER (later are preload assets dependent rules)
    const allRulesToRun = getRulesToRun(this.rules, context, options);
    const runNowRules = allRulesToRun.now;
    const runLaterRules = allRulesToRun.later;
    // init a NOW queue for rules to run immediately
    const nowRulesQueue = queue();
    // construct can run NOW rules into NOW queue
    runNowRules.forEach((rule: RuleLike) => {
      nowRulesQueue.defer(getDefferedRule(rule, context, options));
    });
    // init a PRELOADER queue to start preloading assets
    const preloaderQueue = queue();
    // defer preload if preload dependent rules exist
    if (runLaterRules.length) {
      preloaderQueue.defer((res: (result: unknown) => void) => {
        // handle both success and fail of preload
        // and resolve, to allow to run all checks
        preload(options)
          .then((assets: unknown) => res(assets))
          .catch((err: unknown) => {
            /**
             * Note:
             * we do not reject, to allow other (non-preload) rules to `run`
             * -> instead we resolve as `undefined`
             */
            console.warn(`Couldn't load preload assets: `, err);
            res(undefined);
          });
      });
    }
    // defer now and preload queue to run immediately
    const queueForNowRulesAndPreloader = queue();
    queueForNowRulesAndPreloader.defer(nowRulesQueue);
    queueForNowRulesAndPreloader.defer(preloaderQueue);
    // invoke the now queue
    queueForNowRulesAndPreloader
      .then((nowRulesAndPreloaderResults: unknown[]) => {
        // interpolate results into separate variables
        const assetsFromQueue = nowRulesAndPreloaderResults.pop() as
          | unknown[]
          | undefined;
        if (assetsFromQueue && assetsFromQueue.length) {
          // result is a queue (again), hence the index resolution
          // assets is either an object of key value pairs of asset type and values
          // eg: cssom: [stylesheets]
          // or undefined if preload failed
          const assets = assetsFromQueue[0];
          // extend context with preloaded assets
          if (assets) {
            context = {
              ...(context as Record<string, unknown>),
              ...(assets as Record<string, unknown>)
            };
          }
        }
        // the reminder of the results are RuleResults
        const nowRulesResults = nowRulesAndPreloaderResults[0] as unknown[];
        // if there are no rules to run LATER - resolve with rule results
        if (!runLaterRules.length) {
          // remove the cache
          axe._selectCache = undefined;
          // resolve
          resolve(nowRulesResults.filter((result: unknown) => !!result));
          return;
        }
        // init a LATER queue for rules that are dependant on preloaded assets
        const laterRulesQueue = queue();
        runLaterRules.forEach((rule: RuleLike) => {
          const deferredRule = getDefferedRule(rule, context, options);
          laterRulesQueue.defer(deferredRule);
        });
        // invoke the later queue
        laterRulesQueue
          .then((laterRuleResults: unknown[]) => {
            // remove the cache
            axe._selectCache = undefined;
            // resolve
            resolve(
              nowRulesResults
                .concat(laterRuleResults)
                .filter((result: unknown) => !!result)
            );
          })
          .catch(reject);
      })
      .catch(reject);
  }
  /**
   * Runs Rule `after` post processing functions
   * @param  {Array} results  Array of RuleResults to postprocess
   * @param  {Mixed} options  Options object to pass into rules and/or disable rules or checks
   */
  after(
    results: RuleResultLike[],
    options: Record<string, unknown>
  ): unknown[] {
    const rules = this.rules;
    return results.map((ruleResult: RuleResultLike) => {
      if (ruleResult.error) {
        return ruleResult;
      }
      const rule = findBy(rules, 'id', ruleResult.id) as RuleLike | undefined;
      if (!rule) {
        // If you see this, you're probably running the Mocha tests with the axe extension installed
        throw new Error(
          'Result for unknown rule. You may be running mismatch axe-core versions'
        );
      }
      try {
        return rule.after(ruleResult, options);
      } catch (err) {
        if ((options as Record<string, unknown>).debug) {
          throw err;
        }
        return createIncompleteErrorResult(
          rule,
          err as Error & { errorNode?: unknown }
        );
      }
    });
  }
  /**
   * Get the rule with a given ID
   * @param  {string}
   * @return {Rule}
   */
  getRule(ruleId: string): RuleLike | undefined {
    return this.rules.find((rule: RuleLike) => rule.id === ruleId);
  }

  /*
   * Updates the default options and then applies them
   * @param  {Mixed} options  Options object
   */
  setBranding(branding: string | BrandingObject | undefined): void {
    const previous = {
      brand: this.brand,
      application: this.application
    };
    if (typeof branding === 'string') {
      this.application = branding;
    }
    if (
      branding &&
      typeof branding === 'object' &&
      branding.hasOwnProperty('brand') &&
      branding.brand &&
      typeof branding.brand === 'string'
    ) {
      this.brand = branding.brand;
    }
    if (
      branding &&
      typeof branding === 'object' &&
      branding.hasOwnProperty('application') &&
      branding.application &&
      typeof branding.application === 'string'
    ) {
      this.application = branding.application;
    }
    this._constructHelpUrls(previous);
  }
  _constructHelpUrls(previous: BrandingObject | null = null): void {
    // TODO: es-modules-version
    const version = (axe.version.match(/^[1-9][0-9]*\.[0-9]+/) || ['x.y'])[0];
    this.rules.forEach((rule: RuleLike) => {
      if (!this.data.rules[rule.id]) {
        this.data.rules[rule.id] = {};
      }
      const metaData = this.data.rules[rule.id]!;
      if (
        typeof metaData.helpUrl !== 'string' ||
        (previous &&
          metaData.helpUrl ===
            getHelpUrl(
              previous as { brand: string; application: string; lang?: string },
              rule.id,
              version
            ))
      ) {
        metaData.helpUrl = getHelpUrl(this, rule.id, version);
      }
    });
  }
  /**
   * Reset the default rules, checks and meta data
   */
  resetRulesAndChecks(): void {
    this._init();
    this._resetLocale();
  }
}

function getDefaultOrigin(): string | undefined {
  // @see https://html.spec.whatwg.org/multipage/webappapis.html#dom-origin-dev
  // window.origin does not exist in ie11
  // prevent origin default "null" string on CDP `Page.setDocumentContent` https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-setDocumentContent
  if (window.origin && window.origin !== 'null') {
    return window.origin;
  }
  // window.location does not exist in node when we run the build
  if (
    window.location &&
    window.location.origin &&
    window.location.origin !== 'null'
  ) {
    return window.location.origin;
  }
}

function getDefaultConfiguration(audit: AuditConfig | undefined): AuditConfig {
  let config: AuditConfig;
  if (audit) {
    config = clone(audit) as AuditConfig;
    // Commons are configured into axe like everything else,
    // however because things go funky if we have multiple commons objects
    // we're not using the copy of that.
    config.commons = audit.commons;
  } else {
    config = {};
  }

  config.reporter = config.reporter || null;
  config.noHtml = config.noHtml || false;

  if (!config.allowedOrigins) {
    const defaultOrigin = getDefaultOrigin();
    config.allowedOrigins = defaultOrigin ? [defaultOrigin] : [];
  }

  config.rules = config.rules || [];
  config.checks = config.checks || [];
  config.data = { checks: {}, rules: {}, ...config.data };
  return config;
}

function unpackToObject(
  collection: unknown[],
  audit: Audit,
  method: string
): void {
  let i: number, l: number;
  for (i = 0, l = collection.length; i < l; i++) {
    (audit as unknown as Record<string, (item: unknown) => void>)[method]!(
      collection[i]
    );
  }
}

/**
 * Merge two check locales (a, b), favoring `b`.
 *
 * Both locale `a` and the returned shape resemble:
 *
 *    {
 *      impact: string,
 *      messages: {
 *        pass: string | function,
 *        fail: string | function,
 *        incomplete: string | {
 *          [key: string]: string | function
 *        }
 *      }
 *    }
 *
 * Locale `b` follows the `axe.CheckLocale` shape and resembles:
 *
 *    {
 *      pass: string,
 *      fail: string,
 *      incomplete: string | { [key: string]: string }
 *    }
 */

const mergeCheckLocale = (
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> => {
  let { pass, fail } = b;
  // If the message(s) are Strings, they have not yet been run
  // thru doT (which will return a Function).
  if (typeof pass === 'string' && dotRegex.test(pass)) {
    pass = doT.compile(pass);
  }
  if (typeof fail === 'string' && dotRegex.test(fail)) {
    fail = doT.compile(fail);
  }
  const aMessages = a.messages as Record<string, unknown>;
  return {
    ...a,
    messages: {
      pass: pass || aMessages.pass,
      fail: fail || aMessages.fail,
      incomplete:
        typeof aMessages.incomplete === 'object'
          ? // TODO: for compleness-sake, we should be running
            // incomplete messages thru doT as well. This was
            // out-of-scope for runtime localization, but should
            // eventually be addressed.
            {
              ...(aMessages.incomplete as Record<string, unknown>),
              ...(b.incomplete as Record<string, unknown>)
            }
          : b.incomplete
    }
  };
};

/**
 * Merge two rule locales (a, b), favoring `b`.
 */

const mergeRuleLocale = (
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> => {
  let { help, description } = b;
  // If the message(s) are Strings, they have not yet been run
  // thru doT (which will return a Function).
  if (typeof help === 'string' && dotRegex.test(help)) {
    help = doT.compile(help);
  }
  if (typeof description === 'string' && dotRegex.test(description)) {
    description = doT.compile(description);
  }
  return {
    ...a,
    help: help || a.help,
    description: description || a.description
  };
};

/**
 * Merge two failure messages (a, b), favoring `b`.
 */

const mergeFailureMessage = (
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> => {
  let { failureMessage } = b;
  // If the message(s) are Strings, they have not yet been run
  // thru doT (which will return a Function).
  if (typeof failureMessage === 'string' && dotRegex.test(failureMessage)) {
    failureMessage = doT.compile(failureMessage);
  }
  return {
    ...a,
    failureMessage: failureMessage || a.failureMessage
  };
};

/**
 * Merge two incomplete fallback messages (a, b), favoring `b`.
 */

const mergeFallbackMessage = (a: unknown, b: unknown): unknown => {
  if (typeof b === 'string' && dotRegex.test(b)) {
    b = doT.compile(b);
  }
  return b || a;
};

/**
 * Splits a given array of rules to two, with rules that can be run immediately and one's that are dependent on preloadedAssets
 * @method getRulesToRun
 * @param {Array<Object>} rules complete list of rules
 * @param {Object} context
 * @param {Object} options
 * @return {Object} out, an object containing two arrays, one being list of rules to run now and list of rules to run later
 * @private
 */
function getRulesToRun(
  rules: RuleLike[],
  context: unknown,
  options: Record<string, unknown>
): RuleSplitResult {
  // entry object for reduce function below
  const base: RuleSplitResult = {
    now: [],
    later: []
  };

  // iterate through rules and separate out rules that need to be run now vs later
  const splitRules = rules.reduce((out: RuleSplitResult, rule: RuleLike) => {
    // ensure rule can run
    if (
      !ruleShouldRun(
        rule as Record<string, unknown>,
        context as Record<string, unknown>,
        options
      )
    ) {
      return out;
    }

    // does rule require preload assets - push to later array
    if (rule.preload) {
      out.later.push(rule);
      return out;
    }

    // default to now array
    out.now.push(rule);

    // return
    return out;
  }, base);

  // return
  return splitRules;
}

/**
 * Convenience method, that consturcts a rule `run` function that can be deferred
 * @param {Object} rule rule to be deferred
 * @param {Object} context context object essential to be passed into rule `run`
 * @param {Object} options normalised options to be passed into rule `run`
 * @param {Object} assets (optional) preloaded assets to be passed into rule and checks (if the rule is preload dependent)
 * @return {Function} a deferrable function for rule
 */
function getDefferedRule(
  rule: RuleLike,
  context: unknown,
  options: Record<string, unknown>
): (
  resolve: (result: unknown) => void,
  reject: (error: unknown) => void
) => void {
  // init performance timer of requested via options
  if (options.performanceTimer) {
    performanceTimer.mark('mark_rule_start_' + rule.id);
  }

  return (
    resolve: (result: unknown) => void,
    reject: (error: unknown) => void
  ) => {
    // invoke `rule.run`
    rule.run(
      context,
      options,
      (ruleResult: unknown) => resolve(ruleResult),
      (err: unknown) => {
        if (options.debug) {
          reject(err);
        } else {
          resolve(
            createIncompleteErrorResult(
              rule,
              err as Error & { errorNode?: unknown }
            )
          );
        }
      }
    );
  };
}

function createIncompleteErrorResult(
  rule: RuleLike,
  error: Error & { errorNode?: unknown }
): Record<string, unknown> {
  const { errorNode } = error;
  const serialError = serializeError(error);
  const none = [
    {
      id: 'error-occurred',
      result: undefined,
      data: serialError,
      relatedNodes: []
    }
  ];
  const node = errorNode || new DqElement(document.documentElement);
  return Object.assign(
    new (RuleResult as unknown as new (
      rule: RuleLike
    ) => Record<string, unknown>)(rule),
    {
      error: serialError,
      result: constants.CANTTELL,
      nodes: [{ any: [], all: [], none, node }]
    }
  );
}

/**
 * For all the rules, create the helpUrl and add it to the data for that rule
 */
function getHelpUrl(
  {
    brand,
    application,
    lang
  }: { brand: string; application: string; lang?: string },
  ruleId: string,
  version: string
): string {
  return (
    constants.helpUrlBase +
    brand +
    '/' +
    (version || axe.version.substring(0, axe.version.lastIndexOf('.'))) +
    '/' +
    ruleId +
    '?application=' +
    encodeURIComponent(application) +
    (lang && lang !== 'en' ? '&lang=' + encodeURIComponent(lang) : '')
  );
}
