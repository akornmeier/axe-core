import constants from '../constants';
import aggregate from './aggregate';

const { CANTTELL_PRIO, FAIL_PRIO } = constants;
const checkMap: Array<boolean | null> = [];
checkMap[constants.PASS_PRIO as number] = true;
checkMap[constants.CANTTELL_PRIO as number] = null;
checkMap[constants.FAIL_PRIO as number] = false;

/**
 * Map over the any / all / none properties
 */
const checkTypes = ['any', 'all', 'none'] as const;
function anyAllNone(
  obj: Record<string, unknown>,
  functor: (val: Record<string, unknown>, type: string) => unknown
): Record<string, unknown[]> {
  return checkTypes.reduce(
    (out, type) => {
      out[type] = ((obj[type] as unknown[]) || []).map((val: unknown) =>
        functor(val as Record<string, unknown>, type)
      );
      return out;
    },
    {} as Record<string, unknown[]>
  );
}

function aggregateChecks(
  nodeResOriginal: Record<string, unknown>
): Record<string, unknown> {
  // Create a copy
  const nodeResult: Record<string, unknown> = Object.assign(
    {},
    nodeResOriginal
  );

  // map each result value to a priority
  anyAllNone(nodeResult, (check, type) => {
    const i =
      typeof check.result === 'undefined'
        ? -1
        : checkMap.indexOf(check.result as boolean | null);
    // default to cantTell
    check.priority = i !== -1 ? i : constants.CANTTELL_PRIO;

    if (type === 'none') {
      // For none, swap pass and fail outcomes.
      // none-type checks should pass when result is false rather than true.
      if (check.priority === constants.PASS_PRIO) {
        check.priority = constants.FAIL_PRIO;
      } else if (check.priority === constants.FAIL_PRIO) {
        check.priority = constants.PASS_PRIO;
      }
    }
  });

  // Find the result with the highest priority
  const priorities: Record<string, number> = {
    all: (nodeResult.all as Array<Record<string, unknown>>).reduce(
      (a: number, b: Record<string, unknown>) =>
        Math.max(a, b.priority as number),
      0
    ),
    none: (nodeResult.none as Array<Record<string, unknown>>).reduce(
      (a: number, b: Record<string, unknown>) =>
        Math.max(a, b.priority as number),
      0
    ),
    // get the lowest passing of 'any' defaulting
    // to 0 by wrapping around 4 to 0 (inapplicable)
    any:
      (nodeResult.any as Array<Record<string, unknown>>).reduce(
        (a: number, b: Record<string, unknown>) =>
          Math.min(a, b.priority as number),
        4
      ) % 4
  };

  (nodeResult as Record<string, unknown>).priority = Math.max(
    priorities.all!,
    priorities.none!,
    priorities.any!
  );

  // Of each type, filter out all results not matching the final priority
  const impacts: unknown[] = [];
  checkTypes.forEach(type => {
    (nodeResult as Record<string, Array<Record<string, unknown>>>)[type] = (
      nodeResult[type] as Array<Record<string, unknown>>
    ).filter((check: Record<string, unknown>) => {
      return (
        check.priority === (nodeResult as Record<string, unknown>).priority &&
        check.priority === priorities[type]
      );
    });
    (nodeResult[type] as Array<Record<string, unknown>>).forEach(
      (check: Record<string, unknown>) => impacts.push(check.impact)
    );
  });

  // for failed nodes, define the impact
  if (
    [CANTTELL_PRIO, FAIL_PRIO].includes(
      (nodeResult as Record<string, unknown>).priority as number
    )
  ) {
    nodeResult.impact = aggregate(
      constants.impact as unknown as string[],
      impacts as string[]
    );
  } else {
    nodeResult.impact = null;
  }

  // Delete the old result and priority properties
  anyAllNone(nodeResult, c => {
    delete c.result;
    delete c.priority;
  });

  // Convert the index to a result string value
  nodeResult.result =
    constants.results[
      (nodeResult as Record<string, unknown>).priority as number
    ];
  delete (nodeResult as Record<string, unknown>).priority;

  return nodeResult;
}

export default aggregateChecks;
