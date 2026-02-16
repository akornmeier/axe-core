import { matchAncestry } from '../../core/utils';

export default function headingOrderAfter(results: any[]): any[] {
  // Construct a map of all headings on the page
  const headingOrder = getHeadingOrder(results);
  results.forEach((result: any) => {
    result.result = getHeadingOrderOutcome(result, headingOrder);
  });
  return results;
}

function getHeadingOrderOutcome(
  result: any,
  headingOrder: any[]
): boolean | undefined {
  const index = findHeadingOrderIndex(headingOrder, result.node.ancestry);
  const currLevel = headingOrder[index]?.level ?? -1;
  const prevLevel = headingOrder[index - 1]?.level ?? -1;

  if (index === 0) {
    return true;
  }
  if (currLevel === -1) {
    return undefined;
  }
  return currLevel - prevLevel <= 1;
}

function getHeadingOrder(results: any[]): any[] {
  results = [...results];
  results.sort(({ node: nodeA }: any, { node: nodeB }: any) => {
    return nodeA.ancestry.length - nodeB.ancestry.length;
  });
  const headingOrder = results.reduce(mergeHeadingOrder, []);
  return headingOrder.filter(({ level }: any) => level !== -1);
}

function mergeHeadingOrder(mergedHeadingOrder: any[], result: any): any[] {
  const frameHeadingOrder = result.data?.headingOrder;
  const frameAncestry = shortenArray(result.node.ancestry, 1);

  if (!frameHeadingOrder) {
    return mergedHeadingOrder;
  }

  const normalizedHeadingOrder = frameHeadingOrder.map((heading: any) => {
    return addFrameToHeadingAncestry(heading, frameAncestry);
  });

  const index = getFrameIndex(mergedHeadingOrder, frameAncestry);
  if (index === -1) {
    mergedHeadingOrder.push(...normalizedHeadingOrder);
  } else {
    mergedHeadingOrder.splice(index, 0, ...normalizedHeadingOrder);
  }
  return mergedHeadingOrder;
}

function getFrameIndex(headingOrder: any[], frameAncestry: any[]): number {
  while (frameAncestry.length) {
    const index = findHeadingOrderIndex(headingOrder, frameAncestry);
    if (index !== -1) {
      return index;
    }
    frameAncestry = shortenArray(frameAncestry, 1);
  }
  return -1;
}

function findHeadingOrderIndex(headingOrder: any[], ancestry: any[]): number {
  return headingOrder.findIndex((heading: any) => {
    return matchAncestry(heading.ancestry, ancestry);
  });
}

function addFrameToHeadingAncestry(heading: any, frameAncestry: any[]): any {
  const ancestry = frameAncestry.concat(heading.ancestry);
  return { ...heading, ancestry };
}

function shortenArray(arr: any[], spliceLength: number): any[] {
  return arr.slice(0, arr.length - spliceLength);
}
