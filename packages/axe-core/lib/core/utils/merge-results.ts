import nodeSerializer from './node-serializer';
import getAllChecks from './get-all-checks';
import findBy from './find-by';

function pushFrame(
  resultSet: Array<Record<string, unknown>>,
  options: Record<string, unknown>,
  frameSpec: Record<string, unknown>
): void {
  resultSet.forEach(res => {
    res.node = nodeSerializer.mergeSpecs(
      res.node as Record<string, unknown>,
      frameSpec
    );
    const checks = getAllChecks(res);
    checks.forEach((check: unknown) => {
      (check as Record<string, unknown>).relatedNodes = (
        (check as Record<string, unknown>).relatedNodes as Array<
          Record<string, unknown>
        >
      ).map(node => nodeSerializer.mergeSpecs(node, frameSpec));
    });
  });
}

function spliceNodes(
  target: Array<Record<string, unknown>>,
  to: Array<Record<string, unknown>>
): void {
  const firstFromFrame = to[0]!.node as Record<string, unknown>;
  let node: Record<string, unknown>;
  for (let i = 0; i < target.length; i++) {
    node = target[i]!.node as Record<string, unknown>;
    const resultSort = nodeIndexSort(
      node.nodeIndexes as number[],
      firstFromFrame.nodeIndexes as number[]
    );
    if (
      resultSort > 0 ||
      (resultSort === 0 &&
        (firstFromFrame.selector as unknown[]).length <
          (node.selector as unknown[]).length)
    ) {
      target.splice(i, 0, ...to);
      return;
    }
  }
  target.push(...to);
}

function normalizeResult(
  result: Record<string, unknown> | null
): Array<Record<string, unknown>> | null {
  if (!result || !result.results) {
    return null;
  }
  if (!Array.isArray(result.results)) {
    return [result.results as Record<string, unknown>];
  }
  if (!result.results.length) {
    return null;
  }
  return result.results as Array<Record<string, unknown>>;
}

function mergeResults(
  frameResults: Array<Record<string, unknown>>,
  options: Record<string, unknown>
): Array<Record<string, unknown>> {
  const mergedResult: Array<Record<string, unknown>> = [];
  frameResults.forEach(frameResult => {
    const results = normalizeResult(frameResult);
    if (!results || !results.length) {
      return;
    }

    const frameSpec = getFrameSpec(frameResult);
    results.forEach(ruleResult => {
      if (ruleResult.nodes && frameSpec) {
        pushFrame(
          ruleResult.nodes as Array<Record<string, unknown>>,
          options,
          frameSpec
        );
      }

      const res = findBy(mergedResult, 'id', ruleResult.id);
      if (!res) {
        mergedResult.push(ruleResult);
      } else {
        if ((ruleResult.nodes as unknown[]).length) {
          spliceNodes(
            res.nodes as Array<Record<string, unknown>>,
            ruleResult.nodes as Array<Record<string, unknown>>
          );
        }
        if (ruleResult.error) {
          res.error ??= ruleResult.error;
        }
      }
    });
  });

  mergedResult.forEach(result => {
    if (result.nodes) {
      (result.nodes as Array<Record<string, unknown>>).sort((nodeA, nodeB) => {
        return nodeIndexSort(
          (nodeA.node as Record<string, unknown>).nodeIndexes as number[],
          (nodeB.node as Record<string, unknown>).nodeIndexes as number[]
        );
      });
    }
  });
  return mergedResult;
}

function nodeIndexSort(
  nodeIndexesA: number[] = [],
  nodeIndexesB: number[] = []
): number {
  const length = Math.max(nodeIndexesA?.length, nodeIndexesB?.length);
  for (let i = 0; i < length; i++) {
    const indexA = nodeIndexesA?.[i];
    const indexB = nodeIndexesB?.[i];
    if (typeof indexA !== 'number' || isNaN(indexA)) {
      return i === 0 ? 1 : -1;
    }
    if (typeof indexB !== 'number' || isNaN(indexB)) {
      return i === 0 ? -1 : 1;
    }
    if (indexA !== indexB) {
      return indexA - indexB;
    }
  }
  return 0;
}

export default mergeResults;

function getFrameSpec(
  frameResult: Record<string, unknown>
): Record<string, unknown> | null {
  if (frameResult.frameElement) {
    return nodeSerializer.toSpec(frameResult.frameElement);
  } else if (frameResult.frameSpec) {
    return frameResult.frameSpec as Record<string, unknown>;
  }
  return null;
}
