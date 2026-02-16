import SerialVirtualNode from '../base/virtual-node/serial-virtual-node';
import AbstractVirtualNode from '../base/virtual-node/abstract-virtual-node';
import * as helpers from '../reporters/helpers';
import {
  publishMetaData,
  finalizeRuleResult,
  aggregateResult,
  getEnvironmentData,
  getRule
} from '../utils';
import type { RunOptions } from '@axe-core/schemas';

declare const axe: {
  _audit: {
    reporter: string;
  };
  _selectorData: unknown;
};

interface VirtualRuleOptions extends Partial<RunOptions> {
  reporter?: string;
  [key: string]: unknown;
}

interface RuleLike {
  runSync: (context: unknown, options: unknown) => unknown;
  excludeHidden: boolean;
  [key: string]: unknown;
}

/**
 * Run a rule in a non-browser environment
 * @param ruleId  Id of the rule
 * @param vNode  The virtual node to run the rule against
 * @param options  (optional) Set of options passed into rules or checks
 * @return axe results for the rule run
 */
export default function runVirtualRule(
  ruleId: string,
  vNode: unknown,
  options: VirtualRuleOptions = {}
): Record<string, unknown> {
  // TODO: es-modules axe._audit
  // TODO: es-modules axe._selectorData
  options.reporter = options.reporter || axe._audit.reporter || 'v1';
  axe._selectorData = {};

  let virtualNode = vNode;
  if (!(virtualNode instanceof AbstractVirtualNode)) {
    // @ts-expect-error - SerialVirtualNode constructor accepts raw node specs
    virtualNode = new SerialVirtualNode(virtualNode);
  }

  let rule = getRule(ruleId) as RuleLike | null;

  if (!rule) {
    throw new Error('unknown rule `' + ruleId + '`');
  }

  // rule.prototype.gather calls axe.utils.isHidden which in turn calls
  // window.getComputedStyle if the rule excludes hidden elements. we
  // can avoid this call by forcing the rule to not exclude hidden
  // elements
  rule = Object.create(rule, { excludeHidden: { value: false } }) as RuleLike;
  const context = {
    initiator: true,
    include: [virtualNode],
    exclude: [] as unknown[],
    frames: [] as unknown[],
    page: false,
    focusable: true,
    size: {},
    flatTree: [] as unknown[]
  };

  const rawResults = rule.runSync(context, options) as Record<string, unknown>;
  publishMetaData(rawResults);
  finalizeRuleResult(rawResults);
  const results = aggregateResult([rawResults]) as Record<string, unknown>;

  (
    results['violations'] as Array<{ nodes: Array<Record<string, unknown>> }>
  ).forEach(result =>
    result.nodes.forEach(nodeResult => {
      nodeResult['failureSummary'] = helpers.failureSummary(
        nodeResult as Parameters<typeof helpers.failureSummary>[0]
      );
    })
  );

  return {
    ...(getEnvironmentData() as Record<string, unknown>),
    ...results,
    toolOptions: options
  };
}
