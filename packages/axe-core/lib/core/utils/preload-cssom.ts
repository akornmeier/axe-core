import getStyleSheetFactory from './get-stylesheet-factory';
import uniqueArray from './unique-array';
import getRootNode from './get-root-node';
import parseStylesheet from './parse-stylesheet';
import querySelectorAllFilter from './query-selector-all-filter';

/**
 * Given a rootNode - construct CSSOM
 * -> get all source nodes (document & document fragments) within given root node
 * -> recursively call `parseStylesheets` to resolve styles for each node
 *
 * @method preloadCssom
 * @memberof `axe.utils`
 * @param {Object} options composite options object
 * @property {Array<String>} options.assets array of preloaded assets requested, eg: [`cssom`]
 * @property {Number} options.timeout timeout
 * @property {Object} options.treeRoot (optional) the DOM tree to be inspected
 * @returns {Promise}
 */
function preloadCssom({
  treeRoot = (axe._tree as unknown[])[0]
}: Record<string, unknown>): Promise<unknown> {
  /**
   * get all `document` and `documentFragment` with in given `tree`
   */
  const rootNodes = getAllRootNodesInTree(treeRoot);

  if (!rootNodes.length) {
    return Promise.resolve();
  }

  const dynamicDoc = document.implementation.createHTMLDocument(
    'Dynamic document for loading cssom'
  );

  const convertDataToStylesheet = getStyleSheetFactory(dynamicDoc);

  return getCssomForAllRootNodes(
    rootNodes,
    convertDataToStylesheet as unknown as (
      opts: Record<string, unknown>
    ) => Record<string, unknown>
  ).then(assets => flattenAssets(assets));
}

export default preloadCssom;

interface RootNodeEntry {
  shadowId: string;
  rootNode: Document | DocumentFragment;
}

/**
 * Returns am array of source nodes containing `document` and `documentFragment` in a given `tree`.
 *
 * @param {Object} treeRoot tree
 * @returns {Array<Object>} array of objects, which each object containing a root and an optional `shadowId`
 */
function getAllRootNodesInTree(tree: unknown): RootNodeEntry[] {
  const ids: string[] = [];

  const rootNodes = querySelectorAllFilter(tree, '*', (node: unknown) => {
    if (ids.includes((node as Record<string, unknown>).shadowId as string)) {
      return false;
    }
    ids.push((node as Record<string, unknown>).shadowId as string);
    return true;
  }).map(node => {
    return {
      shadowId: (node as Record<string, unknown>).shadowId as string,
      rootNode: getRootNode(
        (node as Record<string, unknown>).actualNode as Node
      ) as Document | DocumentFragment
    };
  });

  return uniqueArray(rootNodes, []) as RootNodeEntry[];
}

/**
 * Process CSSOM on all root nodes
 *
 * @param {Array<Object>} rootNodes array of root nodes, where node  is an enhanced `document` or `documentFragment` object returned from `getAllRootNodesInTree`
 * @param {Function} convertDataToStylesheet fn to convert given data to Stylesheet object
 * @returns {Promise}
 */
function getCssomForAllRootNodes(
  rootNodes: RootNodeEntry[],
  convertDataToStylesheet: (
    opts: Record<string, unknown>
  ) => Record<string, unknown>
): Promise<unknown[]> {
  const promises: Promise<unknown>[] = [];

  rootNodes.forEach(({ rootNode, shadowId }, index) => {
    const sheets = getStylesheetsOfRootNode(
      rootNode,
      shadowId,
      convertDataToStylesheet
    );
    if (!sheets) {
      return Promise.all(promises);
    }

    const rootIndex = index + 1;
    const parseOptions: Record<string, unknown> = {
      rootNode,
      shadowId,
      convertDataToStylesheet,
      rootIndex
    };
    /**
     * Note:
     * `importedUrls` - keeps urls of already imported stylesheets, to prevent re-fetching
     * eg: nested, cyclic or cross referenced `@import` urls
     */
    const importedUrls: string[] = [];

    const p = Promise.all(
      sheets.map((sheet: CSSStyleSheet, sheetIndex: number) => {
        const priority = [rootIndex, sheetIndex];

        return parseStylesheet(sheet, parseOptions, priority, importedUrls);
      })
    );

    promises.push(p);
  });

  return Promise.all(promises);
}

/**
 * Flatten CSSOM assets
 *
 * @param {Array.<Object[]>} assets nested assets (varying depth)
 * @returns {Array<Object>} Array of CSSOM object
 */
function flattenAssets(assets: unknown[]): unknown[] {
  return assets.reduce(
    (acc: unknown[], val: unknown) =>
      Array.isArray(val)
        ? (acc as unknown[]).concat(flattenAssets(val))
        : (acc as unknown[]).concat(val),
    []
  );
}

/**
 * Get stylesheet(s) for root
 *
 * @param {Object} options.rootNode `document` or `documentFragment`
 * @param {String} options.shadowId an id if undefined denotes that given root is a document fragment/ shadowDOM
 * @param {Function} options.convertDataToStylesheet a utility function to generate a style sheet from given data (text)
 * @returns {Array<Object>} an array of stylesheets
 */
function getStylesheetsOfRootNode(
  rootNode: Document | DocumentFragment,
  shadowId: string,
  convertDataToStylesheet: (
    opts: Record<string, unknown>
  ) => Record<string, unknown>
): CSSStyleSheet[] | null {
  let sheets: CSSStyleSheet[];

  // nodeType === 11  -> DOCUMENT_FRAGMENT
  if (rootNode.nodeType === 11 && shadowId) {
    sheets = getStylesheetsFromDocumentFragment(
      rootNode as DocumentFragment,
      convertDataToStylesheet
    );
  } else {
    sheets = getStylesheetsFromDocument(rootNode as Document);
  }

  return filterStylesheetsWithSameHref(sheets);
}

/**
 * Get stylesheets from `documentFragment`
 *
 * @property {Object} options.rootNode `documentFragment`
 * @property {Function} options.convertDataToStylesheet a utility function to generate a stylesheet from given data
 * @returns {Array<Object>}
 */
function getStylesheetsFromDocumentFragment(
  rootNode: DocumentFragment,
  convertDataToStylesheet: (
    opts: Record<string, unknown>
  ) => Record<string, unknown>
): CSSStyleSheet[] {
  return (
    Array.from((rootNode as unknown as Element).children)
      .filter(filerStyleAndLinkAttributesInDocumentFragment)
      // Reducer to convert `<style></style>` and `<link>` references to `CSSStyleSheet` object
      .reduce((out: CSSStyleSheet[], node) => {
        const nodeName = node.nodeName.toUpperCase();
        const data = nodeName === 'STYLE' ? node.textContent : node;
        const isLink = nodeName === 'LINK';
        const stylesheet = convertDataToStylesheet({
          data,
          isLink,
          root: rootNode
        });
        // prevent error in jsdom with style elements not having a `sheet` property
        // @see https://github.com/jsdom/jsdom/issues/3179
        if (stylesheet.sheet) {
          out.push(stylesheet.sheet as unknown as CSSStyleSheet);
        }
        return out;
      }, [])
  );
}

/**
 * Get stylesheets from `document`
 * -> filter out stylesheet that are `media=print`
 *
 * @param {Object} rootNode `document`
 * @returns {Array<Object>}
 */
function getStylesheetsFromDocument(rootNode: Document): CSSStyleSheet[] {
  return Array.from(rootNode.styleSheets).filter((sheet: CSSStyleSheet) => {
    if (!sheet.media) {
      return false;
    }

    return filterMediaIsPrint(sheet.media.mediaText);
  });
}

/**
 * Get all `<style></style>` and `<link>` attributes
 * -> limit to only `style` or `link` attributes with `rel=stylesheet` and `media != print`
 *
 * @param {Object} node HTMLElement
 * @returns {Boolean}
 */
function filerStyleAndLinkAttributesInDocumentFragment(node: Element): boolean {
  const nodeName = node.nodeName.toUpperCase();
  const linkHref = node.getAttribute('href');
  const linkRel = node.getAttribute('rel');
  const isLink =
    nodeName === 'LINK' &&
    linkHref &&
    linkRel &&
    (node as HTMLLinkElement).rel.toUpperCase().includes('STYLESHEET');
  const isStyle = nodeName === 'STYLE';
  return (
    isStyle || (!!isLink && filterMediaIsPrint((node as HTMLLinkElement).media))
  );
}

/**
 * Exclude `link[rel='stylesheet]` attributes where `media=print`
 *
 * @param {String} media media value eg: 'print'
 * @returns {Boolean}
 */
function filterMediaIsPrint(media: string): boolean {
  if (!media) {
    return true;
  }
  return !media.toUpperCase().includes('PRINT');
}

/**
 * Exclude any duplicate `stylesheets`, that share the same `href`
 *
 * @param {Array<Object>} sheets stylesheets
 * @returns {Array<Object>}
 */
function filterStylesheetsWithSameHref(
  sheets: CSSStyleSheet[]
): CSSStyleSheet[] {
  const hrefs: string[] = [];
  return sheets.filter(sheet => {
    if (!sheet.href) {
      // include sheets without `href`
      return true;
    }
    // if `href` is present, ensure they are not duplicates
    if (hrefs.includes(sheet.href)) {
      return false;
    }
    hrefs.push(sheet.href);
    return true;
  });
}
