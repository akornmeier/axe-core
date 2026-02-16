import AbstractVirtualNode from './abstract-virtual-node';
import { isXHTML, validInputTypes } from '../../utils';
import { isFocusable, getTabbableElements } from '../../../commons/dom';
import cache from '../cache';

let nodeIndex = 0;

interface VirtualNodeProps {
  nodeType: number;
  nodeName: string;
  id: string;
  type: string | undefined;
  nodeValue: string | null;
  multiple?: boolean;
  value?: string;
  selected?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  [key: string]: unknown;
}

interface VirtualNodeCache {
  props?: VirtualNodeProps;
  attrNames?: string[];
  computedStyle?: CSSStyleDeclaration;
  isFocusable?: boolean;
  tabbableElements?: VirtualNode[];
  clientRects?: DOMRect[];
  boundingClientRect?: DOMRect;
  [key: string]: unknown;
}

class VirtualNode extends AbstractVirtualNode {
  shadowId: string | undefined;
  children: VirtualNode[];
  actualNode: Node & Element;
  nodeIndex: number;
  _isHidden: boolean | null;
  _cache: VirtualNodeCache;
  _isXHTML: boolean;
  _type: string | undefined;

  /**
   * Wrap the real node and provide list of the flattened children
   * @param {Node} node the node in question
   * @param {VirtualNode} parent The parent VirtualNode
   * @param {String} shadowId the ID of the shadow DOM to which this node belongs
   */
  constructor(
    node: Node & Element,
    parent: AbstractVirtualNode | undefined,
    shadowId: string | undefined
  ) {
    super();
    this.shadowId = shadowId;
    this.children = [];
    this.actualNode = node;
    this.parent = parent;

    if (!parent) {
      nodeIndex = 0;
    }
    this.nodeIndex = nodeIndex++;

    this._isHidden = null; // will be populated by axe.utils.isHidden
    this._cache = {};
    this._isXHTML = isXHTML(node.ownerDocument) as boolean;

    // we will normalize the type prop for inputs by looking strictly
    // at the attribute and not what the browser resolves the type
    // to be
    if (node.nodeName.toLowerCase() === 'input') {
      let type: string | null = (node as Element).getAttribute('type');
      type = this._isXHTML ? type : (type || '').toLowerCase();

      if (!validInputTypes().includes(type as string)) {
        type = 'text';
      }

      this._type = type as string;
    }

    if (cache.get('nodeMap')) {
      (cache.get('nodeMap') as Map<Node, VirtualNode>).set(node, this);
    }
  }

  // abstract Node properties so we can run axe in DOM-less environments.
  // add to the prototype so memory is shared across all virtual nodes
  override get props(): VirtualNodeProps {
    if (!this._cache.hasOwnProperty('props')) {
      const { nodeType, nodeName, id, nodeValue } = this
        .actualNode as Element & { nodeValue: string | null };

      this._cache.props = {
        nodeType,
        nodeName: this._isXHTML ? nodeName : nodeName.toLowerCase(),
        id,
        type: this._type,
        nodeValue
      };

      // We avoid reading these on node types where they won't be relevant
      // to work around issues like #4316.
      if (nodeType === 1) {
        const el = this.actualNode as HTMLInputElement;
        this._cache.props.multiple = el.multiple;
        this._cache.props.value = el.value;
        this._cache.props.selected = (
          el as unknown as HTMLOptionElement
        ).selected;
        this._cache.props.checked = el.checked;
        this._cache.props.indeterminate = el.indeterminate;
      }
    }

    return this._cache.props as VirtualNodeProps;
  }

  /**
   * Get the value of the given attribute name.
   * @param {String} attrName The name of the attribute.
   * @return {String|null} The value of the attribute or null if the attribute does not exist
   */
  override attr(attrName: string): string | null {
    if (typeof this.actualNode.getAttribute !== 'function') {
      return null;
    }

    return this.actualNode.getAttribute(attrName);
  }

  /**
   * Determine if the element has the given attribute.
   * @param {String} attrName The name of the attribute
   * @return {Boolean} True if the element has the attribute, false otherwise.
   */
  override hasAttr(attrName: string): boolean {
    if (typeof this.actualNode.hasAttribute !== 'function') {
      return false;
    }

    return this.actualNode.hasAttribute(attrName);
  }

  /**
   * Return a list of attribute names for the element.
   * @return {String[]}
   */
  override get attrNames(): string[] {
    if (!this._cache.hasOwnProperty('attrNames')) {
      let attrs: NamedNodeMap;

      // eslint-disable-next-line no-restricted-syntax
      if (this.actualNode.attributes instanceof window.NamedNodeMap) {
        // eslint-disable-next-line no-restricted-syntax
        attrs = this.actualNode.attributes;
      }
      // if the attributes property is not of type NamedNodeMap
      // then the DOM has been clobbered. E.g. <form><input name="attributes"></form>.
      // We can clone the node to isolate it and then return
      // the attributes
      else {
        attrs = (this.actualNode.cloneNode(false) as Element).attributes;
      }

      this._cache.attrNames = Array.from(attrs).map(attr => attr.name);
    }
    return this._cache.attrNames as string[];
  }

  /**
   * Return a property of the computed style for this element and cache the result. This is much faster than called `getPropteryValue` every time.
   * @see https://jsperf.com/get-property-value
   * @return {String}
   */
  getComputedStylePropertyValue(property: string): string {
    const key = 'computedStyle_' + property;
    if (!this._cache.hasOwnProperty(key)) {
      if (!this._cache.hasOwnProperty('computedStyle')) {
        this._cache.computedStyle = window.getComputedStyle(
          this.actualNode as Element
        );
      }

      this._cache[key] = (
        this._cache.computedStyle as CSSStyleDeclaration
      ).getPropertyValue(property);
    }
    return this._cache[key] as string;
  }

  /**
   * Determine if the element is focusable and cache the result.
   * @return {Boolean} True if the element is focusable, false otherwise.
   */
  get isFocusable(): boolean {
    if (!this._cache.hasOwnProperty('isFocusable')) {
      this._cache.isFocusable = isFocusable(this.actualNode);
    }
    return this._cache.isFocusable as boolean;
  }

  /**
   * Return the list of tabbable elements for this element and cache the result.
   * @return {VirtualNode[]}
   */
  get tabbableElements(): VirtualNode[] {
    if (!this._cache.hasOwnProperty('tabbableElements')) {
      this._cache.tabbableElements = getTabbableElements(this);
    }
    return this._cache.tabbableElements as VirtualNode[];
  }

  /**
   * Return the client rects for this element and cache the result.
   * @return {DOMRect[]}
   */
  get clientRects(): DOMRect[] {
    if (!this._cache.hasOwnProperty('clientRects')) {
      this._cache.clientRects = Array.from(
        this.actualNode.getClientRects()
      ).filter(rect => rect.width > 0);
    }
    return this._cache.clientRects as DOMRect[];
  }

  /**
   * Return the bounding rect for this element and cache the result.
   * @return {DOMRect}
   */
  get boundingClientRect(): DOMRect {
    if (!this._cache.hasOwnProperty('boundingClientRect')) {
      this._cache.boundingClientRect = this.actualNode.getBoundingClientRect();
    }
    return this._cache.boundingClientRect as DOMRect;
  }
}

export default VirtualNode;
