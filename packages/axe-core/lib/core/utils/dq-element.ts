import getSelector from './get-selector';
import getAncestry from './get-ancestry';
import getXpath from './get-xpath';
import getNodeFromTree from './get-node-from-tree';
import AbstractVirtualNode from '../base/virtual-node/abstract-virtual-node';
import cache from '../base/cache';
import memoize from './memoize';
import getNodeAttributes from './get-node-attributes';
import VirtualNode from '../../core/base/virtual-node/virtual-node';

const CACHE_KEY = 'DqElm.RunOptions';

function getOuterHtml(element: Element): string {
  let source = element.outerHTML;

  if (!source && typeof window.XMLSerializer === 'function') {
    source = new window.XMLSerializer().serializeToString(element);
  }

  return source || '';
}

/**
 * Truncates the outerHTML property of an element
 * @param  {Node}   element the element node which needs to be truncated
 */

export function truncateElement(element: Element): string {
  const maxLen = 300;
  const maxAttrNameOrValueLen = 20;

  const deepStr = getOuterHtml(element);
  let vNode = getNodeFromTree(element);
  if (!vNode) {
    vNode = new VirtualNode(element, undefined, undefined);
  }
  const { nodeName } = (vNode as Record<string, unknown>).props as Record<
    string,
    unknown
  >;

  if (deepStr.length < maxLen) {
    return deepStr;
  }

  const attributeStrList: string[] = [];
  const shallowNode = element.cloneNode(false) as Element;
  const elementNodeMap = getNodeAttributes(shallowNode);

  let str = getOuterHtml(shallowNode);

  if (str.length < maxLen) {
    let attrString = '';
    for (const { name, value } of elementNodeMap as unknown as Iterable<{
      name: string;
      value: string;
    }>) {
      const attr = { name, value };
      attrString += ` ${attr.name}="${attr.value}"`;
    }

    str = `<${nodeName}${attrString}>`;
    return str;
  }
  let strLen = `<${nodeName}>`.length;

  for (const { name, value } of elementNodeMap as unknown as Iterable<{
    name: string;
    value: string;
  }>) {
    if (strLen > maxLen) {
      break;
    }

    const attr = { name, value };
    let attrName = attr.name;
    let attrValue = attr.value;

    attrName =
      attrName.length > maxAttrNameOrValueLen
        ? attrName.substring(0, maxAttrNameOrValueLen) + '...'
        : attrName;
    attrValue =
      attrValue.length > maxAttrNameOrValueLen
        ? attrValue.substring(0, maxAttrNameOrValueLen) + '...'
        : attrValue;

    const strAttr = `${attrName}="${attrValue}"`;
    strLen += (' ' + strAttr).length;
    attributeStrList.push(strAttr);
  }

  str = `<${nodeName} ${attributeStrList.join(' ')}>`;
  if (str.length > maxLen) {
    str = str.substring(0, maxLen) + ' ...>';
  } else if (
    attributeStrList.length <
    (elementNodeMap as unknown as ArrayLike<unknown>).length
  ) {
    str = str.substring(0, str.length - 1) + ' ...>';
  }

  return str;
}

function getSource(element: Element | null): string {
  if (!element) {
    return '';
  }

  return truncateElement(element);
}

interface DqElementSpec {
  selector?: unknown[];
  ancestry?: unknown[];
  xpath?: unknown[];
  nodeIndexes?: number[];
  source?: string;
  element?: Element;
  fromFrame?: boolean;
  [key: string]: unknown;
}

interface DqElementOptions {
  elementRef?: boolean;
  absolutePaths?: boolean;
  toRoot?: boolean;
}

interface DqElementInstance {
  spec: DqElementSpec;
  _virtualNode: unknown;
  _element: Element | null;
  fromFrame: boolean;
  _includeElementInJson: boolean | undefined;
  _options: DqElementOptions | undefined;
  nodeIndexes: number[];
  source: string | null;
  selector: unknown[];
  ancestry: unknown[];
  xpath: unknown[];
  element: Element | null;
  toJSON(): DqElementSpec;
}

/**
 * "Serialized" `HTMLElement`. It will calculate the CSS selector,
 * grab the source (outerHTML) and offer an array for storing frame paths
 * @param {HTMLElement} element The element to serialize
 * @param {Object} options Propagated from axe.run/etc
 * @param {Object} spec Properties to use in place of the element when instantiated on Elements from other frames
 */
const DqElement = memoize(function DqElement(
  this: DqElementInstance,
  elm: unknown,
  options?: DqElementOptions | null,
  spec?: DqElementSpec
) {
  options ??= null;
  spec ??= {};

  if (!options) {
    options = cache.get(CACHE_KEY) ?? {};
  }

  this.spec = spec;
  if (elm instanceof AbstractVirtualNode) {
    this._virtualNode = elm;
    this._element = (elm as unknown as Record<string, unknown>)
      .actualNode as Element | null;
  } else {
    this._element = elm as Element;
    this._virtualNode = getNodeFromTree(elm as Element);
  }

  /**
   * Whether DqElement was created from an iframe
   * @type {boolean}
   */
  this.fromFrame = (this.spec.selector as unknown[])?.length > 1;

  this._includeElementInJson = options?.elementRef;

  if (options?.absolutePaths) {
    this._options = { toRoot: true };
  }

  /**
   * Number by which nodes in the flat tree can be sorted
   * @type {Number}
   */
  this.nodeIndexes = [];
  if (Array.isArray(this.spec.nodeIndexes)) {
    this.nodeIndexes = this.spec.nodeIndexes;
  } else if (
    typeof (this._virtualNode as Record<string, unknown>)?.nodeIndex ===
    'number'
  ) {
    this.nodeIndexes = [
      (this._virtualNode as Record<string, unknown>).nodeIndex as number
    ];
  }

  /**
   * The generated HTML source code of the element
   * @type {String|null}
   */
  this.source = null;
  // @ts-expect-error - axe is a global variable
  if (!axe._audit.noHtml) {
    this.source = this.spec.source ?? getSource(this._element);
  }

  return this;
}) as unknown as {
  new (
    elm: unknown,
    options?: DqElementOptions | null,
    spec?: DqElementSpec
  ): DqElementInstance;
  fromFrame: (
    node: DqElementSpec,
    options: DqElementOptions,
    frame: DqElementSpec & { element: Element }
  ) => DqElementInstance;
  mergeSpecs: (
    child: DqElementSpec,
    parentFrame: DqElementSpec
  ) => DqElementSpec;
  setRunOptions: (opts: {
    elementRef?: boolean;
    absolutePaths?: boolean;
  }) => void;
  prototype: DqElementInstance;
};

DqElement.prototype = {
  /**
   * A unique CSS selector for the element, designed for readability
   * @return {String}
   */
  get selector(): unknown[] {
    return (
      this.spec.selector || [
        getSelector(
          this.element!,
          this._options as Record<string, unknown> | undefined
        )
      ]
    );
  },

  /**
   * A unique CSS selector for the element, including its ancestors down to the root node
   * @return {String}
   */
  get ancestry(): unknown[] {
    return this.spec.ancestry || [getAncestry(this.element!)];
  },

  /**
   * Xpath to the element
   * @return {String}
   */
  get xpath(): unknown[] {
    return this.spec.xpath || [getXpath(this.element!)];
  },

  /**
   * Direct reference to the `HTMLElement` wrapped by this `DQElement`.
   */
  get element(): Element | null {
    return this._element;
  },

  /**
   * Converts to a "spec", a form suitable for use with JSON.stringify
   * (*not* to pre-stringified JSON)
   * @returns {Object}
   */
  toJSON(): DqElementSpec {
    const spec: DqElementSpec = {
      selector: this.selector,
      source: this.source as string,
      xpath: this.xpath,
      ancestry: this.ancestry,
      nodeIndexes: this.nodeIndexes,
      fromFrame: this.fromFrame
    };
    if (this._includeElementInJson) {
      spec.element = this._element as Element;
    }
    return spec;
  }
} as DqElementInstance;

/** @deprecated */
DqElement.fromFrame = function fromFrame(
  node: DqElementSpec,
  options: DqElementOptions,
  frame: DqElementSpec & { element: Element }
): DqElementInstance {
  const spec = DqElement.mergeSpecs(node, frame);
  return new DqElement(frame.element, options, spec);
};

DqElement.mergeSpecs = function mergeSpecs(
  child: DqElementSpec,
  parentFrame: DqElementSpec
): DqElementSpec {
  // Parameter order reversed for backcompat
  return {
    ...child,
    selector: [...(parentFrame.selector || []), ...(child.selector || [])],
    ancestry: [...(parentFrame.ancestry || []), ...(child.ancestry || [])],
    xpath: [...(parentFrame.xpath || []), ...(child.xpath || [])],
    nodeIndexes: [
      ...(parentFrame.nodeIndexes || []),
      ...(child.nodeIndexes || [])
    ],
    fromFrame: true
  };
};

/**
 * Set the default options to be used
 * @param {Object} RunOptions Options passed to axe.run()
 * @property {boolean} elementRef Add element when toJSON is called
 * @property {boolean} absolutePaths Use absolute path fro selectors
 */
DqElement.setRunOptions = function setRunOptions({
  elementRef,
  absolutePaths
}: {
  elementRef?: boolean;
  absolutePaths?: boolean;
}): void {
  cache.set(CACHE_KEY, { elementRef, absolutePaths });
};

export default DqElement;
