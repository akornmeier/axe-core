import { createFrameContext } from './context/create-frame-context';
import { normalizeContext } from './context/normalize-context';
import { parseSelectorArray } from './context/parse-selector-array';
import {
  findBy,
  getFlattenedTree,
  select,
  isNodeInContext,
  nodeSorter,
  respondable,
  clone
} from '../utils';
import { isVisibleToScreenReaders } from '../../commons/dom';

interface ContextLikeForParsing {
  include: unknown[];
  exclude: unknown[];
  flatTree: unknown[];
  frames?: FrameContextLike[] | undefined;
  [key: string]: unknown;
}

interface ContextSpec {
  page?: boolean | undefined;
  initiator?: boolean | undefined;
  focusable?: boolean | undefined;
  size?: Record<string, unknown> | undefined;
  include?: unknown;
  exclude?: unknown;
  [key: string]: unknown;
}

interface FrameContextLike {
  node: unknown;
  include: unknown[];
  exclude: unknown[];
  page?: boolean | undefined;
  [key: string]: unknown;
}

interface ContextInstance {
  frames: FrameContextLike[];
  page: boolean | undefined;
  initiator: boolean;
  focusable: boolean;
  size: Record<string, unknown>;
  flatTree: unknown[];
  exclude: unknown[];
  include: unknown[];
}

/**
 * Holds context of includes, excludes and frames for analysis.
 *
 * @todo  clarify and sync changes to design doc
 * Context : {IncludeStrings} || {
 *   // defaults to document/all
 *   include: {IncludeStrings},
 *   exclude : {ExcludeStrings}
 * }
 *
 * IncludeStrings : [{CSSSelectorArray}] || Node
 * ExcludeStrings : [{CSSSelectorArray}]
 * `CSSSelectorArray` an Array of selector strings that addresses a Node in a multi-frame document. All addresses
 * are in this form regardless of whether the document contains any frames.To evaluate the selectors to
 * find the node referenced by the array, evaluate the selectors in-order, starting in window.top. If N
 * is the length of the array, then the first N-1 selectors should result in an iframe and the last
 * selector should result in the specific node.
 *
 * @param {Object} spec Configuration or "specification" object
 */
export default function Context(
  this: ContextInstance,
  spec: unknown,
  flatTree?: unknown[]
): void {
  spec = clone(spec);
  this.frames = [];
  this.page =
    typeof (spec as ContextSpec)?.page === 'boolean'
      ? (spec as ContextSpec).page
      : undefined;
  this.initiator =
    typeof (spec as ContextSpec)?.initiator === 'boolean'
      ? ((spec as ContextSpec).initiator as boolean)
      : true;
  this.focusable =
    typeof (spec as ContextSpec)?.focusable === 'boolean'
      ? ((spec as ContextSpec).focusable as boolean)
      : true;
  this.size =
    typeof (spec as ContextSpec)?.size === 'object'
      ? ((spec as ContextSpec).size as Record<string, unknown>)
      : {};

  const normalized = normalizeContext(spec);

  // cache the flattened tree
  this.flatTree = flatTree ?? getFlattenedTree(getRootNode(normalized));
  this.exclude = normalized.exclude;
  this.include = normalized.include;

  this.include = parseSelectorArray(
    this as unknown as ContextLikeForParsing,
    'include'
  );
  this.exclude = parseSelectorArray(
    this as unknown as ContextLikeForParsing,
    'exclude'
  );

  select('frame, iframe', this as unknown as Record<string, unknown>).forEach(
    (frame: unknown) => {
      if (
        isNodeInContext(
          frame as Parameters<typeof isNodeInContext>[0],
          this as unknown as Parameters<typeof isNodeInContext>[1]
        )
      ) {
        pushUniqueFrame(
          this,
          (frame as Record<string, unknown>).actualNode as Element
        );
      }
    }
  );

  if (typeof this.page === 'undefined') {
    // Figure out if the entire page is in scope
    this.page = isPageContext(this);
    this.frames.forEach((frame: FrameContextLike) => {
      frame.page = this.page;
    });
  }

  // Validate outside of a frame
  validateContext(this);

  if (!Array.isArray(this.include)) {
    this.include = Array.from(this.include);
  }
  this.include.sort(nodeSorter as (a: unknown, b: unknown) => number); // ensure that the order of the include nodes is document order
}

/**
 * Pushes a unique frame onto `frames` array, filtering any hidden iframes
 * @private
 * @param  {Object} Context      Parent context for the frame
 * @param  {HTMLElement} frame   The frame to push onto Context
 */
function pushUniqueFrame(context: ContextInstance, frame: Element): void {
  if (
    !isVisibleToScreenReaders(frame) ||
    findBy(context.frames, 'node', frame)
  ) {
    return;
  }
  context.frames.push(
    createFrameContext(frame, context) as unknown as FrameContextLike
  );
}

/**
 * Check if a normalized context tests the full page
 * @private
 */
function isPageContext({ include }: { include: unknown[] }): boolean {
  return (
    include.length === 1 &&
    (include[0] as Record<string, unknown>).actualNode ===
      document.documentElement
  );
}

/**
 * Check that the context, as well as each frame includes at least 1 element
 * @private
 * @param  {context} context
 * @return {Error}
 */
function validateContext(context: ContextInstance): void {
  if (context.include.length === 0 && context.frames.length === 0) {
    const env = respondable.isInFrame() ? 'frame' : 'page';
    throw new Error('No elements found for include in ' + env + ' Context');
  }
}

/**
 * For a context-like object, find its shared root node
 */
function getRootNode({
  include,
  exclude
}: {
  include: unknown[];
  exclude: unknown[];
}): Element {
  const selectors = Array.from(include).concat(Array.from(exclude));
  // Find the first Element.ownerDocument or Document
  for (let i = 0; i < selectors.length; i++) {
    const item = selectors[i];
    if (item instanceof window.Element) {
      return item.ownerDocument.documentElement;
    }

    if (item instanceof window.Document) {
      return item.documentElement;
    }
  }
  return document.documentElement;
}
