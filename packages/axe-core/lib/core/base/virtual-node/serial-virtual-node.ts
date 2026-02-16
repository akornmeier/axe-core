import AbstractVirtualNode from './abstract-virtual-node';
import { assert, validInputTypes } from '../../utils';

interface SerialNodeInput {
  nodeName?: string | undefined;
  nodeType?: number | undefined;
  type?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  [key: string]: unknown;
}

interface SerialNodeProps {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly type?: string;
  readonly [key: string]: unknown;
}

class SerialVirtualNode extends AbstractVirtualNode {
  _props: SerialNodeProps;
  _attrs: Record<string, string | null>;

  /**
   * Convert a serialised node into a VirtualNode object
   * @param {Object} node Serialised node
   */
  constructor(serialNode: SerialNodeInput) {
    super();
    this._props = normaliseProps(serialNode);
    this._attrs = normaliseAttrs(serialNode);
  }

  // Accessor for DOM node properties
  override get props(): SerialNodeProps {
    return this._props;
  }

  /**
   * Get the value of the given attribute name.
   * @param {String} attrName The name of the attribute.
   * @return {String|null} The value of the attribute or null if the attribute does not exist
   */
  override attr(attrName: string): string | null {
    return this._attrs[attrName] ?? null;
  }

  /**
   * Determine if the element has the given attribute.
   * @param {String} attrName The name of the attribute
   * @return {Boolean} True if the element has the attribute, false otherwise.
   */
  override hasAttr(attrName: string): boolean {
    return this._attrs[attrName] !== undefined;
  }

  /**
   * Return a list of attribute names for the element.
   * @return {String[]}
   */
  override get attrNames(): string[] {
    return Object.keys(this._attrs);
  }
}

const nodeNamesToTypes: Record<string, number> = {
  '#cdata-section': 2,
  '#text': 3,
  '#comment': 8,
  '#document': 9,
  '#document-fragment': 11
};
const nodeTypeToName: Record<number, string> = {};
const nodeNames = Object.keys(nodeNamesToTypes);
nodeNames.forEach(nodeName => {
  nodeTypeToName[nodeNamesToTypes[nodeName]!] = nodeName;
});

/**
 * Convert between serialised props and DOM-like properties
 * @param {Object} serialNode
 * @return {Object} normalProperties
 */
function normaliseProps(serialNode: SerialNodeInput): SerialNodeProps {
  let nodeName: string | undefined =
    serialNode.nodeName ?? nodeTypeToName[serialNode.nodeType as number];
  const nodeType: number =
    serialNode.nodeType ?? nodeNamesToTypes[serialNode.nodeName as string] ?? 1;

  assert(
    typeof nodeType === 'number',
    `nodeType has to be a number, got '${nodeType}'`
  );
  assert(
    typeof nodeName === 'string',
    `nodeName has to be a string, got '${nodeName}'`
  );

  nodeName = (nodeName as string).toLowerCase();
  let type: string | null = null;
  if (nodeName === 'input') {
    type = (
      (serialNode.type as string) ||
      (serialNode.attributes && (serialNode.attributes.type as string)) ||
      ''
    ).toLowerCase();

    if (!validInputTypes().includes(type)) {
      type = 'text';
    }
  }

  const props: Record<string, unknown> = {
    ...serialNode,
    nodeType,
    nodeName
  };
  if (type) {
    props.type = type;
  }

  delete props.attributes;
  return Object.freeze(props) as SerialNodeProps;
}

/**
 * Convert between serialised attributes and DOM-like attributes
 * @param {Object} serialNode
 * @return {Object} normalAttributes
 */
function normaliseAttrs({
  attributes = {}
}: SerialNodeInput): Record<string, string | null> {
  const attrMap: Record<string, string> = {
    htmlFor: 'for',
    className: 'class'
  };

  return Object.keys(attributes).reduce<Record<string, string | null>>(
    (attrs, attrName) => {
      const value = attributes[attrName];
      assert(
        typeof value !== 'object' || value === null,
        `expects attributes not to be an object, '${attrName}' was`
      );

      if (value !== undefined) {
        const mappedName = attrMap[attrName] || attrName;
        attrs[mappedName] = value !== null ? String(value) : null;
      }
      return attrs;
    },
    {}
  );
}

export default SerialVirtualNode;
