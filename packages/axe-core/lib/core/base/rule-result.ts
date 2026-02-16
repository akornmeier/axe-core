import constants from '../constants';

interface RuleLike {
  id: string;
  pageLevel: boolean;
}

interface RuleResultInstance {
  id: string;
  result: string;
  pageLevel: boolean;
  impact: string | null;
  nodes: unknown[];
}

/**
 * Constructor for the result of Rules
 * @param {Rule} rule
 */
function RuleResult(this: RuleResultInstance, rule: RuleLike): void {
  /**
   * The ID of the Rule whom this result belongs to
   * @type {String}
   */
  this.id = rule.id;

  /**
   * The calculated result of the Rule, either PASS, FAIL or NA
   * @type {String}
   */
  this.result = constants.NA as string;

  /**
   * Whether the Rule is a "pageLevel" rule
   * @type {Boolean}
   */
  this.pageLevel = rule.pageLevel;

  /**
   * Impact of the violation
   * @type {String}  Plain-english impact or null if rule passes
   */
  this.impact = null;

  /**
   * Holds information regarding nodes and individual CheckResults
   * @type {Array}
   */
  this.nodes = [];
}

export default RuleResult;
