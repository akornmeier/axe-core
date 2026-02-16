import constants from '../constants';

function copyToGroup(
  resultObject: Record<string, unknown[]>,
  subResult: Record<string, unknown>,
  group: string
): void {
  const resultCopy: Record<string, unknown> = Object.assign({}, subResult);
  resultCopy.nodes = ((resultCopy[group] as unknown[]) || []).concat();
  constants.resultGroups.forEach((resultGroup: string) => {
    delete resultCopy[resultGroup];
  });
  resultObject[group]!.push(resultCopy);
}

/**
 * Calculates the result of a Rule based on its types and the result of its child Checks
 * @param  {RuleResult} ruleResult The RuleResult to calculate the result of
 */
function aggregateResult(
  results: Array<Record<string, unknown>>
): Record<string, unknown[]> {
  const resultObject: Record<string, unknown[]> = {};

  // Create an array for each type
  constants.resultGroups.forEach(
    (groupName: string) => (resultObject[groupName] = [])
  );

  // Fill the array with nodes
  results.forEach(subResult => {
    if (subResult.error) {
      copyToGroup(resultObject, subResult, constants.CANTTELL_GROUP as string);
    } else if (subResult.result === constants.NA) {
      copyToGroup(resultObject, subResult, constants.NA_GROUP as string);
    } else {
      constants.resultGroups.forEach((group: string) => {
        if (
          Array.isArray(subResult[group]) &&
          (subResult[group] as unknown[]).length > 0
        ) {
          copyToGroup(resultObject, subResult, group);
        }
      });
    }
  });
  return resultObject;
}

export default aggregateResult;
