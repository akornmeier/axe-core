import assert from './assert';
import DqElement from './dq-element';

let customSerializer: Record<string, unknown> | null = null;

const nodeSerializer = {
  update(serializer: Record<string, unknown>): void {
    assert(typeof serializer === 'object', 'serializer must be an object');
    customSerializer = serializer;
  },

  toSpec(node: unknown): Record<string, unknown> {
    return nodeSerializer.dqElmToSpec(new DqElement(node as Node));
  },

  dqElmToSpec(
    dqElm: unknown,
    runOptions?: Record<string, unknown>
  ): Record<string, unknown> {
    if (dqElm instanceof DqElement === false) {
      return dqElm as Record<string, unknown>;
    }
    if (runOptions) {
      dqElm = cloneLimitedDqElement(
        dqElm as InstanceType<typeof DqElement>,
        runOptions
      );
    }

    if (typeof customSerializer?.toSpec === 'function') {
      return (
        customSerializer.toSpec as (elm: unknown) => Record<string, unknown>
      )(dqElm);
    }
    return (dqElm as InstanceType<typeof DqElement>).toJSON();
  },

  mergeSpecs(
    nodeSpec: Record<string, unknown>,
    parentFrameSpec: Record<string, unknown>
  ): Record<string, unknown> {
    if (typeof customSerializer?.mergeSpecs === 'function') {
      return (
        customSerializer.mergeSpecs as (
          a: Record<string, unknown>,
          b: Record<string, unknown>
        ) => Record<string, unknown>
      )(nodeSpec, parentFrameSpec);
    }
    return DqElement.mergeSpecs(nodeSpec, parentFrameSpec);
  },

  mapRawResults(
    rawResults: Array<Record<string, unknown>>
  ): Array<Record<string, unknown>> {
    return rawResults.map(rawResult => ({
      ...rawResult,
      nodes: nodeSerializer.mapRawNodeResults(
        rawResult.nodes as Array<Record<string, unknown>>
      )
    }));
  },

  mapRawNodeResults(
    nodeResults: Array<Record<string, unknown>> | undefined
  ): Array<Record<string, unknown>> | undefined {
    return nodeResults?.map(({ node, ...nodeResult }) => {
      (nodeResult as Record<string, unknown>).node =
        nodeSerializer.dqElmToSpec(node);

      for (const type of ['any', 'all', 'none'] as const) {
        (nodeResult as Record<string, unknown>)[type] = (
          (nodeResult as Record<string, unknown>)[type] as Array<
            Record<string, unknown>
          >
        ).map(({ relatedNodes, ...checkResult }) => {
          (checkResult as Record<string, unknown>).relatedNodes = (
            relatedNodes as unknown[]
          ).map((elm: unknown) => nodeSerializer.dqElmToSpec(elm));
          return checkResult;
        });
      }
      return nodeResult;
    });
  }
};

export default nodeSerializer;

function cloneLimitedDqElement(
  dqElm: InstanceType<typeof DqElement>,
  runOptions: Record<string, unknown>
): InstanceType<typeof DqElement> {
  const fromFrame = dqElm.fromFrame;
  const { ancestry: hasAncestry, xpath: hasXpath } = runOptions;
  const hasSelectors = runOptions.selectors !== false || fromFrame;

  const spec: Record<string, unknown> = {
    nodeIndexes: dqElm.nodeIndexes,
    selector: hasSelectors ? dqElm.selector : [':root'],
    ancestry: hasAncestry ? dqElm.ancestry : [':root']
  };
  if (dqElm.source != null) {
    spec.source = dqElm.source;
  }
  if (hasXpath) {
    spec.xpath = dqElm.xpath as unknown[];
  }
  dqElm = new DqElement(dqElm.element, runOptions, spec);

  dqElm.fromFrame = fromFrame;
  return dqElm;
}
