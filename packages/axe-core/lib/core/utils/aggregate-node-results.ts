import aggregateChecks from './aggregate-checks';
import aggregate from './aggregate';
import finalizeRuleResult from './finalize-result';
import constants from '../constants';

/**
 * Calculates the result of a Rule based on its types and the result of its child Checks
 * @param	{Array} nodeResults The array of nodes tested by the Rule
 */
function aggregateNodeResults(
  nodeResults: Array<Record<string, unknown>>
): Record<string, unknown> {
  const ruleResult: Record<string, unknown> = {};

  // For each node, retrieve the result and impact
  nodeResults = nodeResults.map(nodeResult => {
    // Known result
    if (nodeResult.any && nodeResult.all && nodeResult.none) {
      return aggregateChecks(nodeResult);
    } else if (Array.isArray(nodeResult.node)) {
      return finalizeRuleResult(nodeResult);
    } else {
      throw new TypeError('Invalid Result type');
    }
  });

  // Aggregate the result
  // If there were no nodes passed in, mark the test as inapplicable
  if (nodeResults && nodeResults.length) {
    const resultList = nodeResults.map(node => node.result as string);
    ruleResult.result = aggregate(
      constants.results,
      resultList,
      ruleResult.result as string | undefined
    );
  } else {
    ruleResult.result = 'inapplicable';
  }

  // Create an array for each type
  constants.resultGroups.forEach((group: string) => (ruleResult[group] = []));

  // Fill the array with nodes
  nodeResults.forEach(nodeResult => {
    const groupName = constants.resultGroupMap[nodeResult.result as string]!;
    (ruleResult[groupName] as unknown[]).push(nodeResult);
  });

  // Take the highest impact of failed or canttell rules
  let impactGroup: string = constants.FAIL_GROUP as string;
  if ((ruleResult[impactGroup] as unknown[]).length === 0) {
    impactGroup = constants.CANTTELL_GROUP as string;
  }

  if ((ruleResult[impactGroup] as unknown[]).length > 0) {
    // Get the impact of all issues
    const impactList = (
      ruleResult[impactGroup] as Array<Record<string, unknown>>
    ).map(failure => failure.impact as string);

    ruleResult.impact =
      aggregate(constants.impact as unknown as string[], impactList) || null;
  } else {
    ruleResult.impact = null;
  }

  return ruleResult;
}

export default aggregateNodeResults;
