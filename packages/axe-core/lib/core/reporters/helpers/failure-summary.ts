import type { NodeResult, CheckResult } from '@axe-core/schemas';

declare const axe: {
  _audit: {
    data: {
      failureSummaries: Record<
        string,
        { failureMessage?: (messages: string[]) => string }
      >;
    };
  };
};

interface FailingChecks {
  none: CheckResult[];
  any: CheckResult[];
}

/**
 * Finds failing Checks and combines each help message into an array
 * @param  nodeData Individual "detail" object to generate help messages for
 * @return failure messages
 */
function failureSummary(nodeData: NodeResult): string {
  const failingChecks: FailingChecks = {
    // combine "all" and "none" as messaging is the same
    none: nodeData.none.concat(nodeData.all),
    any: nodeData.any
  };

  return (Object.keys(failingChecks) as Array<keyof FailingChecks>)
    .map(key => {
      if (!failingChecks[key].length) {
        return;
      }

      const sum = axe._audit.data.failureSummaries[key];
      if (sum && typeof sum.failureMessage === 'function') {
        return sum.failureMessage(
          failingChecks[key].map(check => {
            return check.message || '';
          })
        );
      }
    })
    .filter((i): i is string => {
      return i !== undefined;
    })
    .join('\n\n');
}

export default failureSummary;
