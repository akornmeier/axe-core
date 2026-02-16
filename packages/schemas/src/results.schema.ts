import { z } from 'zod';
import { ImpactValueSchema, RunOptionsSchema } from './options.schema.js';
import { UnlabelledFrameSelectorSchema } from './context.schema.js';

// TestEngine
export const TestEngineSchema = z.object({
  name: z.string(),
  version: z.string()
});
export type TestEngine = z.infer<typeof TestEngineSchema>;

// TestRunner
export const TestRunnerSchema = z.object({
  name: z.string()
});
export type TestRunner = z.infer<typeof TestRunnerSchema>;

// TestEnvironment
export const TestEnvironmentSchema = z.object({
  userAgent: z.string(),
  windowWidth: z.number(),
  windowHeight: z.number(),
  orientationAngle: z.optional(z.number()),
  orientationType: z.optional(z.string())
});
export type TestEnvironment = z.infer<typeof TestEnvironmentSchema>;

// EnvironmentData
export const EnvironmentDataSchema = z.object({
  testEngine: TestEngineSchema,
  testRunner: TestRunnerSchema,
  testEnvironment: TestEnvironmentSchema,
  url: z.string(),
  timestamp: z.string()
});
export type EnvironmentData = z.infer<typeof EnvironmentDataSchema>;

// SerialError (recursive via z.lazy)
interface SerialErrorType {
  message: string;
  stack: string;
  name: string;
  cause?: SerialErrorType | undefined;
}

export const SerialErrorSchema: z.ZodType<SerialErrorType> = z.lazy(() =>
  z.object({
    message: z.string(),
    stack: z.string(),
    name: z.string(),
    cause: z.optional(SerialErrorSchema)
  })
);
export type SerialError = z.infer<typeof SerialErrorSchema>;

// RelatedNode
export const RelatedNodeSchema = z.object({
  html: z.string(),
  target: UnlabelledFrameSelectorSchema,
  xpath: z.optional(z.array(z.string())),
  ancestry: z.optional(UnlabelledFrameSelectorSchema)
});
export type RelatedNode = z.infer<typeof RelatedNodeSchema>;

// CheckResult
export const CheckResultSchema = z.object({
  id: z.string(),
  impact: z.string(),
  message: z.string(),
  data: z.unknown(),
  relatedNodes: z.optional(z.array(RelatedNodeSchema))
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

// NodeResult
export const NodeResultSchema = z.object({
  html: z.string(),
  impact: z.optional(ImpactValueSchema),
  target: UnlabelledFrameSelectorSchema,
  xpath: z.optional(z.array(z.string())),
  ancestry: z.optional(UnlabelledFrameSelectorSchema),
  any: z.array(CheckResultSchema),
  all: z.array(CheckResultSchema),
  none: z.array(CheckResultSchema),
  failureSummary: z.optional(z.string())
});
export type NodeResult = z.infer<typeof NodeResultSchema>;

// Result
export const ResultSchema = z.object({
  description: z.string(),
  help: z.string(),
  helpUrl: z.string(),
  id: z.string(),
  impact: z.optional(ImpactValueSchema),
  tags: z.array(z.string()),
  nodes: z.array(NodeResultSchema)
});
export type Result = z.infer<typeof ResultSchema>;

// IncompleteResult (extends Result with optional error)
export const IncompleteResultSchema = ResultSchema.extend({
  error: z.optional(
    z.object({
      name: z.string(),
      message: z.string(),
      stack: z.string(),
      ruleId: z.optional(z.string()),
      method: z.optional(z.string()),
      cause: z.optional(SerialErrorSchema)
    })
  )
});
export type IncompleteResult = z.infer<typeof IncompleteResultSchema>;

// AxeResults
export const AxeResultsSchema = EnvironmentDataSchema.extend({
  toolOptions: RunOptionsSchema,
  passes: z.array(ResultSchema),
  violations: z.array(ResultSchema),
  incomplete: z.array(IncompleteResultSchema),
  inapplicable: z.array(ResultSchema)
});
export type AxeResults = z.infer<typeof AxeResultsSchema>;

// SerialDqElement
export const SerialDqElementSchema = z.object({
  source: z.string(),
  nodeIndexes: z.array(z.number()),
  selector: UnlabelledFrameSelectorSchema,
  xpath: z.array(z.string()),
  ancestry: UnlabelledFrameSelectorSchema
});
export type SerialDqElement = z.infer<typeof SerialDqElementSchema>;

// RuleMetadata
export const RuleMetadataSchema = z.object({
  ruleId: z.string(),
  description: z.string(),
  help: z.string(),
  helpUrl: z.string(),
  tags: z.array(z.string()),
  actIds: z.optional(z.array(z.string()))
});
export type RuleMetadata = z.infer<typeof RuleMetadataSchema>;

// PartialRuleResult
export const PartialRuleResultSchema = z.object({
  id: z.string(),
  result: z.literal('inapplicable'),
  pageLevel: z.boolean(),
  impact: z.null(),
  nodes: z.array(z.record(z.string(), z.unknown()))
});
export type PartialRuleResult = z.infer<typeof PartialRuleResultSchema>;

// PartialResult
export const PartialResultSchema = z.object({
  frames: z.array(SerialDqElementSchema),
  results: z.array(PartialRuleResultSchema),
  environmentData: z.optional(EnvironmentDataSchema)
});
export type PartialResult = z.infer<typeof PartialResultSchema>;

// RawCheckResult
export const RawCheckResultSchema = z.object({
  id: z.string(),
  message: z.string(),
  data: z.unknown(),
  relatedNodes: z.optional(z.array(SerialDqElementSchema)),
  impact: z.optional(ImpactValueSchema)
});
export type RawCheckResult = z.infer<typeof RawCheckResultSchema>;

// RawNodeResult
export const RawNodeResultSchema = z.object({
  node: SerialDqElementSchema,
  any: z.array(RawCheckResultSchema),
  all: z.array(RawCheckResultSchema),
  none: z.array(RawCheckResultSchema),
  impact: z.union([ImpactValueSchema, z.undefined()]),
  result: z.union([
    z.literal('passed'),
    z.literal('failed'),
    z.literal('cantTell')
  ])
});
export type RawNodeResult = z.infer<typeof RawNodeResultSchema>;

// RawResult
export const RawResultSchema = z.object({
  description: z.string(),
  help: z.string(),
  helpUrl: z.string(),
  id: z.string(),
  impact: z.optional(ImpactValueSchema),
  tags: z.array(z.string()),
  inapplicable: z.array(z.never()),
  passes: z.array(RawNodeResultSchema),
  incomplete: z.array(RawNodeResultSchema),
  violations: z.array(RawNodeResultSchema),
  pageLevel: z.boolean(),
  result: z.union([
    z.literal('failed'),
    z.literal('passed'),
    z.literal('incomplete'),
    z.literal('inapplicable')
  ])
});
export type RawResult = z.infer<typeof RawResultSchema>;
