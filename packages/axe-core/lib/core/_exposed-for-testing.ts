/*
  This file only exists to expose inner axe-core functionality for testing prior to being able to support ES6 imports in our tests.
  TODO: remove `_thisWillBeDeletedDoNotUse` once we can support imports in our tests
*/
import Audit from './base/audit';
import CheckResult from './base/check-result';
import Check from './base/check';
import Context from './base/context';
// metadataFunctionMap is imported in index.ts and passed via setMetadataFunctionMap
// import metadataFunctionMap from './base/metadata-function-map';
import RuleResult from './base/rule-result';
import Rule from './base/rule';

import { reporters } from './public/reporter';

import failureSummary from './reporters/helpers/failure-summary';
import incompleteFallbackMessage from './reporters/helpers/incomplete-fallback-msg';
import processAggregate from './reporters/helpers/process-aggregate';

import { setDefaultFrameMessenger } from './utils/frame-messenger';
import {
  cacheNodeSelectors,
  getNodesMatchingExpression
} from './utils/selector-cache';
import { convertSelector } from './utils/matches';

import {
  nativelyHidden,
  displayHidden,
  visibilityHidden,
  contentVisibiltyHidden,
  ariaHidden,
  opacityHidden,
  scrollHidden,
  overflowHidden,
  clipHidden,
  areaHidden,
  detailsHidden
} from '../commons/dom/visibility-methods';

interface ExposedForTesting {
  base: {
    Audit: typeof Audit;
    CheckResult: typeof CheckResult;
    Check: typeof Check;
    Context: typeof Context;
    RuleResult: typeof RuleResult;
    Rule: typeof Rule;
    metadataFunctionMap: Record<string, (...args: any[]) => any>;
  };
  public: {
    reporters: typeof reporters;
  };
  helpers: {
    failureSummary: typeof failureSummary;
    incompleteFallbackMessage: typeof incompleteFallbackMessage;
    processAggregate: typeof processAggregate;
  };
  utils: {
    setDefaultFrameMessenger: typeof setDefaultFrameMessenger;
    cacheNodeSelectors: typeof cacheNodeSelectors;
    getNodesMatchingExpression: typeof getNodesMatchingExpression;
    convertSelector: typeof convertSelector;
  };
  commons: {
    dom: {
      nativelyHidden: typeof nativelyHidden;
      displayHidden: typeof displayHidden;
      visibilityHidden: typeof visibilityHidden;
      contentVisibiltyHidden: typeof contentVisibiltyHidden;
      ariaHidden: typeof ariaHidden;
      opacityHidden: typeof opacityHidden;
      scrollHidden: typeof scrollHidden;
      overflowHidden: typeof overflowHidden;
      clipHidden: typeof clipHidden;
      areaHidden: typeof areaHidden;
      detailsHidden: typeof detailsHidden;
    };
  };
}

const _thisWillBeDeletedDoNotUse: ExposedForTesting = {
  base: {
    Audit,
    CheckResult,
    Check,
    Context,
    RuleResult,
    Rule,
    metadataFunctionMap: {} as Record<string, (...args: any[]) => any>
  },
  public: {
    reporters
  },
  helpers: {
    failureSummary,
    incompleteFallbackMessage,
    processAggregate
  },
  utils: {
    setDefaultFrameMessenger,
    cacheNodeSelectors,
    getNodesMatchingExpression,
    convertSelector
  },
  commons: {
    dom: {
      nativelyHidden,
      displayHidden,
      visibilityHidden,
      contentVisibiltyHidden,
      ariaHidden,
      opacityHidden,
      scrollHidden,
      overflowHidden,
      clipHidden,
      areaHidden,
      detailsHidden
    }
  }
};

export default _thisWillBeDeletedDoNotUse;
