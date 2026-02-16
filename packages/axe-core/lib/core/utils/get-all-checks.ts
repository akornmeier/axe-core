/**
 * Gets all Checks (or CheckResults) for a given Rule or RuleResult
 * @param {RuleResult|Rule} rule
 */
function getAllChecks(object: Record<string, unknown>): unknown[] {
  const result: unknown[] = [];
  return result
    .concat((object.any as unknown[]) || [])
    .concat((object.all as unknown[]) || [])
    .concat((object.none as unknown[]) || []);
}

export default getAllChecks;
