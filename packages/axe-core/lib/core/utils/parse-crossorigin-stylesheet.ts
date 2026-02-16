import parseStylesheet from './parse-stylesheet';
import constants from '../constants';

function parseCrossOriginStylesheet(
  url: string,
  options: Record<string, unknown>,
  priority: number[],
  importedUrls: string[],
  isCrossOrigin: boolean
): Promise<unknown> {
  importedUrls.push(url);

  return new Promise((resolve, reject) => {
    const request = new window.XMLHttpRequest();
    request.open('GET', url);

    request.timeout = (constants.preload as Record<string, unknown>)
      .timeout as number;
    request.addEventListener('error', reject);
    request.addEventListener('timeout', reject);
    request.addEventListener('loadend', (event: ProgressEvent) => {
      if (event.loaded && request.responseText) {
        return resolve(request.responseText);
      }
      reject(request.responseText);
    });

    request.send();
  }).then(data => {
    const result = (
      options.convertDataToStylesheet as (
        opts: Record<string, unknown>
      ) => Record<string, unknown>
    )({
      data,
      isCrossOrigin,
      priority,
      root: options.rootNode,
      shadowId: options.shadowId
    });

    return parseStylesheet(
      (result as Record<string, unknown>).sheet as CSSStyleSheet,
      options,
      priority,
      importedUrls,
      (result as Record<string, unknown>).isCrossOrigin as boolean
    );
  });
}

export default parseCrossOriginStylesheet;
