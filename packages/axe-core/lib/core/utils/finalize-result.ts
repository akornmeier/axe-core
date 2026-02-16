import aggregateNodeResults from './aggregate-node-results';

/**
 * Process rule results, grouping them by outcome
 * @param ruleResult {object}
 * @return {object}
 */
export default function finalizeRuleResult(
  ruleResult: Record<string, unknown>
): Record<string, unknown> {
  // we don't use getRule so that this code does not throw but returns
  // the results
  // @ts-expect-error - axe is a global
  const rule = axe._audit.rules.find(
    ({ id }: { id: string }) => id === ruleResult.id
  );
  if (rule && rule.impact) {
    (ruleResult.nodes as Array<Record<string, unknown>>).forEach(node => {
      ['any', 'all', 'none'].forEach(checkType => {
        ((node[checkType] as unknown[]) || []).forEach(
          (checkResult: unknown) => {
            (checkResult as Record<string, unknown>).impact = rule.impact;
          }
        );
      });
    });
  }

  Object.assign(
    ruleResult,
    aggregateNodeResults(ruleResult.nodes as Array<Record<string, unknown>>)
  );
  delete ruleResult.nodes;

  return ruleResult;
}
