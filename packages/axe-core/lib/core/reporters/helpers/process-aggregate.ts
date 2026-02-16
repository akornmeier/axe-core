import constants from '../../constants';
import { nodeSerializer } from '../../utils';
import type { Result } from '@axe-core/schemas';

declare const axe: {
  _audit: {
    noHtml: boolean;
  };
  utils: {
    aggregateResult(
      results: Array<Record<string, unknown>>
    ): Record<string, RawRuleResult[]>;
  };
};

const resultKeys = constants.resultGroups;

/**
 * Options for configuring the processing of axe results.
 */
export interface ProcessOptions {
  resultTypes?: string[] | undefined;
  elementRef?: boolean | undefined;
  selectors?: boolean | undefined;
  xpath?: boolean | undefined;
  ancestry?: boolean | undefined;
  [key: string]: unknown;
}

/**
 * Intermediate rule result shape before processing is complete.
 */
interface RawRuleResult extends Record<string, unknown> {
  nodes?: RawSubResult[] | undefined;
  pageLevel?: boolean | undefined;
  result?: string | undefined;
}

/**
 * Intermediate node/sub-result shape during processing.
 */
interface RawSubResult extends Record<string, unknown> {
  node?: Record<string, unknown> | undefined;
  result?: string | undefined;
  any?: RawCheckResult[] | undefined;
  all?: RawCheckResult[] | undefined;
  none?: RawCheckResult[] | undefined;
}

interface RawCheckResult {
  relatedNodes?: Array<Record<string, unknown>> | undefined;
  [key: string]: unknown;
}

interface SerializedElement extends Record<string, unknown> {
  html?: string | null | undefined;
  element?: unknown;
  target?: unknown;
  ancestry?: unknown;
  xpath?: unknown;
}

interface ProcessedResults {
  [key: string]: Result[];
}

/**
 * Aggregate and process the axe results,
 * adding desired data to nodes and relatedNodes in each rule result.
 *
 * Prepares result data for reporters.
 */
export default function processAggregate(
  results: Array<Record<string, unknown>>,
  options: ProcessOptions
): ProcessedResults {
  const resultObject: Record<string, RawRuleResult[]> =
    axe.utils.aggregateResult(results);

  resultKeys.forEach((key: string) => {
    if (options.resultTypes && !options.resultTypes.includes(key)) {
      // If the user asks us to, truncate certain finding types to maximum one finding
      (resultObject[key] || []).forEach((ruleResult: RawRuleResult) => {
        if (Array.isArray(ruleResult.nodes) && ruleResult.nodes.length > 0) {
          ruleResult.nodes = [ruleResult.nodes[0]!];
        }
      });
    }
    resultObject[key] = (resultObject[key] || []).map(
      (ruleResult: RawRuleResult) => {
        ruleResult = Object.assign({}, ruleResult);

        if (Array.isArray(ruleResult.nodes) && ruleResult.nodes.length > 0) {
          ruleResult.nodes = ruleResult.nodes.map((subResult: RawSubResult) => {
            if (typeof subResult.node === 'object') {
              const serialElm = trimElementSpec(subResult.node, options);
              Object.assign(subResult, serialElm);
            }
            delete subResult.result;
            delete subResult.node;

            normalizeRelatedNodes(subResult, options);

            return subResult;
          });
        }

        resultKeys.forEach((resultKey: string) => delete ruleResult[resultKey]);
        delete ruleResult.pageLevel;
        delete ruleResult.result;

        return ruleResult;
      }
    );
  });

  return resultObject as unknown as ProcessedResults;
}

function normalizeRelatedNodes(
  node: RawSubResult,
  options: ProcessOptions
): void {
  (['any', 'all', 'none'] as const).forEach(type => {
    if (!Array.isArray(node[type])) {
      return;
    }
    (node[type] as RawCheckResult[])
      .filter((checkRes: RawCheckResult) =>
        Array.isArray(checkRes.relatedNodes)
      )
      .forEach((checkRes: RawCheckResult) => {
        checkRes.relatedNodes = checkRes.relatedNodes!.map(
          (relatedNode: Record<string, unknown>) => {
            return trimElementSpec(relatedNode, options);
          }
        );
      });
  });
}

function trimElementSpec(
  elmSpec: Record<string, unknown> = {},
  runOptions: ProcessOptions
): SerializedElement {
  // Pass options to limit which properties are calculated
  elmSpec = nodeSerializer.dqElmToSpec(
    elmSpec,
    runOptions as Record<string, unknown>
  );
  const serialElm: SerializedElement = {};
  if (axe._audit.noHtml) {
    serialElm.html = null;
  } else {
    serialElm.html = (elmSpec.source as string | undefined) ?? 'Undefined';
  }
  if (runOptions.elementRef && !elmSpec.fromFrame) {
    serialElm.element = elmSpec.element ?? null;
  }
  if (runOptions.selectors !== false || elmSpec.fromFrame) {
    serialElm.target = elmSpec.selector ?? [':root'];
  }
  if (runOptions.ancestry) {
    serialElm.ancestry = elmSpec.ancestry ?? [':root'];
  }
  if (runOptions.xpath) {
    serialElm.xpath = elmSpec.xpath ?? ['/'];
  }
  return serialElm;
}
