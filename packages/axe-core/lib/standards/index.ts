import ariaAttrs from './aria-attrs';
import ariaRoles from './aria-roles';
import dpubRoles from './dpub-roles';
import graphicsRoles from './graphics-roles';
import htmlElms from './html-elms';
import { deepMerge } from '../core/utils';
import cssColors from './css-colors';

import type { AriaRoleDefinition } from './aria-roles';
import type { HtmlElmDefinition } from './html-elms';

export interface StandardsObject {
  ariaAttrs: Record<
    string,
    {
      type: string;
      values?: string[];
      allowEmpty?: boolean;
      global?: boolean;
      unsupported?: boolean;
      minValue?: number;
    }
  >;
  ariaRoles: Record<string, AriaRoleDefinition>;
  htmlElms: Record<string, HtmlElmDefinition>;
  cssColors: Record<string, number[]>;
  [key: string]: Record<string, unknown>;
}

const originals: StandardsObject = {
  ariaAttrs,
  ariaRoles: {
    ...ariaRoles,
    ...dpubRoles,
    ...graphicsRoles
  },
  htmlElms,
  cssColors
};
const standards: StandardsObject = {
  ...originals
};

export function configureStandards(
  config: Partial<Record<string, Record<string, unknown>>>
): void {
  Object.keys(standards).forEach(propName => {
    const configValue = config[propName];
    const standardValue = standards[propName];
    if (configValue && standardValue) {
      standards[propName] = deepMerge(standardValue, configValue) as Record<
        string,
        unknown
      >;
    }
  });
}

export function resetStandards(): void {
  Object.keys(standards).forEach(propName => {
    const original = originals[propName];
    if (original) {
      standards[propName] = original;
    }
  });
}

export default standards;
