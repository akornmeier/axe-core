// @axe-core/schemas - Zod schemas for axe-core
// All types are derived via z.infer<typeof Schema> — these are the single source of truth.

// Options & basic types
export {
  ImpactValueSchema,
  TagValueSchema,
  ReporterVersionSchema,
  RunOnlyTypeSchema,
  ResultGroupsSchema,
  RunOnlySchema,
  RuleObjectSchema,
  PreloadOptionsSchema,
  RunOptionsSchema,
  NormalizedRunOptionsSchema
} from './options.schema.js';
export type {
  ImpactValue,
  TagValue,
  ReporterVersion,
  RunOnlyType,
  ResultGroups,
  RunOnly,
  RuleObject,
  PreloadOptions,
  RunOptions,
  NormalizedRunOptions
} from './options.schema.js';

// Context & selectors
export {
  BaseSelectorSchema,
  ShadowDomSelectorSchema,
  CrossTreeSelectorSchema,
  LabelledShadowDomSelectorSchema,
  FramesSelectorSchema,
  UnlabelledFrameSelectorSchema,
  LabelledFramesSelectorSchema,
  SerialSelectorSchema,
  SerialFrameSelectorSchema,
  SerialSelectorListSchema,
  SerialContextObjectSchema,
  FrameContextObjectSchema
} from './context.schema.js';
export type {
  BaseSelector,
  ShadowDomSelector,
  CrossTreeSelector,
  LabelledShadowDomSelector,
  FramesSelector,
  UnlabelledFrameSelector,
  LabelledFramesSelector,
  SerialSelector,
  SerialFrameSelector,
  SerialSelectorList,
  SerialContextObject,
  FrameContextObject
} from './context.schema.js';

// Results
export {
  TestEngineSchema,
  TestRunnerSchema,
  TestEnvironmentSchema,
  EnvironmentDataSchema,
  SerialErrorSchema,
  CheckResultSchema,
  RelatedNodeSchema,
  NodeResultSchema,
  ResultSchema,
  IncompleteResultSchema,
  AxeResultsSchema,
  SerialDqElementSchema,
  RuleMetadataSchema,
  PartialRuleResultSchema,
  PartialResultSchema,
  RawCheckResultSchema,
  RawNodeResultSchema,
  RawResultSchema
} from './results.schema.js';
export type {
  TestEngine,
  TestRunner,
  TestEnvironment,
  EnvironmentData,
  SerialError,
  CheckResult,
  RelatedNode,
  NodeResult,
  Result,
  IncompleteResult,
  AxeResults,
  SerialDqElement,
  RuleMetadata,
  PartialRuleResult,
  PartialResult,
  RawCheckResult,
  RawNodeResult,
  RawResult
} from './results.schema.js';

// Config
export {
  BrandingSchema,
  AxeConfigurationSchema
} from './config.schema.js';
export type {
  Branding,
  AxeConfiguration
} from './config.schema.js';

// Rule definition
export { RuleDefinitionSchema } from './rule-definition.schema.js';
export type { RuleDefinition } from './rule-definition.schema.js';

// Check definition
export {
  CheckDefinitionSchema,
  CheckHelperSchema,
  AfterResultSchema
} from './check-definition.schema.js';
export type {
  CheckDefinition,
  CheckHelper,
  AfterResult
} from './check-definition.schema.js';

// ARIA & Standards
export {
  AriaAttrsTypeSchema,
  AriaRolesTypeSchema,
  DpubRolesTypeSchema,
  HtmlContentTypesSchema,
  AriaAttrsSchema,
  AriaRolesSchema,
  HtmlElmsVariantSchema,
  HtmlElmsSchema,
  StandardsSchema
} from './aria.schema.js';
export type {
  AriaAttrsType,
  AriaRolesType,
  DpubRolesType,
  HtmlContentTypes,
  AriaAttrs,
  AriaRoles,
  HtmlElmsVariant,
  HtmlElms,
  Standards
} from './aria.schema.js';

// Locale
export {
  CheckMessagesSchema,
  RuleLocaleSchema,
  CheckLocaleSchema,
  LocaleSchema
} from './locale.schema.js';
export type {
  CheckMessages,
  RuleLocale,
  CheckLocale,
  Locale
} from './locale.schema.js';

// Frame messenger
export {
  TopicDataSchema,
  ReplyDataSchema
} from './frame-messenger.schema.js';
export type {
  TopicData,
  ReplyData
} from './frame-messenger.schema.js';
