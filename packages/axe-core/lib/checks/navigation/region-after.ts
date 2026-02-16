import { matchAncestry } from '../../core/utils';

function regionAfter(results: any[]): any[] {
  const iframeResults = results.filter((r: any) => r.data.isIframe);

  results.forEach((r: any) => {
    if (r.result || r.node.ancestry.length === 1) {
      return;
    }

    const frameAncestry = r.node.ancestry.slice(0, -1);
    for (const iframeResult of iframeResults) {
      if (matchAncestry(frameAncestry, iframeResult.node.ancestry)) {
        r.result = iframeResult.result;
        break;
      }
    }
  });

  iframeResults.forEach((r: any) => {
    if (!r.result) {
      r.result = true;
    }
  });
  return results;
}

export default regionAfter;
