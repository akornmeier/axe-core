import standards from '../../standards';
import type { HtmlElmDefinition } from '../../standards/html-elms';
import matchesFn from '../../commons/matches';
import AbstractVirtualNode from '../../core/base/virtual-node/abstract-virtual-node';

interface GetElementSpecOptions {
  noMatchAccessibleName?: boolean;
}

/**
 * Return the spec for an HTML element from the standards object.
 * Since the spec is determined by the node and what attributes it has,
 * a node is required.
 * @param vNode - The VirtualNode to get the spec for.
 * @param options - Options for the spec lookup.
 * @returns The standard spec object
 */
function getElementSpec(
  vNode: AbstractVirtualNode,
  { noMatchAccessibleName = false }: GetElementSpecOptions = {}
): Record<string, unknown> {
  const standard = standards.htmlElms[vNode.props.nodeName] as
    | HtmlElmDefinition
    | undefined;

  // invalid element name (could be an svg or custom element name)
  if (!standard) {
    return {};
  }

  if (!standard.variant) {
    return standard as unknown as Record<string, unknown>;
  }

  // start with the information at the top level
  const { variant, ...spec } = standard;

  // loop through all variants (excluding default) finding anything
  // that matches
  for (const variantName in variant) {
    if (!variant.hasOwnProperty(variantName) || variantName === 'default') {
      continue;
    }

    const variantEntry = variant[variantName];
    if (!variantEntry) {
      continue;
    }
    const { matches, ...props } = variantEntry;
    const matchProperties = Array.isArray(matches) ? matches : [matches];
    for (let i = 0; i < matchProperties.length && noMatchAccessibleName; i++) {
      const matchProp = matchProperties[i];
      if (
        matchProp &&
        typeof matchProp === 'object' &&
        'hasAccessibleName' in matchProp &&
        (matchProp as { hasAccessibleName?: boolean }).hasAccessibleName !==
          undefined
      ) {
        return standard as unknown as Record<string, unknown>;
      }
    }

    if (matchesFn(vNode, matches)) {
      for (const propName in props) {
        if (props.hasOwnProperty(propName)) {
          (spec as Record<string, unknown>)[propName] = (
            props as Record<string, unknown>
          )[propName];
        }
      }
    }
  }

  // apply defaults if properties were not found
  for (const propName in variant.default) {
    if (
      variant.default.hasOwnProperty(propName) &&
      typeof (spec as Record<string, unknown>)[propName] === 'undefined'
    ) {
      (spec as Record<string, unknown>)[propName] = (
        variant.default as Record<string, unknown>
      )[propName];
    }
  }

  return spec as unknown as Record<string, unknown>;
}

export default getElementSpec;
