import { z } from 'zod';

// Basic enum-like types
export const ImpactValueSchema = z.union([
  z.literal('minor'),
  z.literal('moderate'),
  z.literal('serious'),
  z.literal('critical'),
  z.null()
]);
export type ImpactValue = z.infer<typeof ImpactValueSchema>;

export const TagValueSchema = z.string();
export type TagValue = z.infer<typeof TagValueSchema>;

export const ReporterVersionSchema = z.union([
  z.literal('v1'),
  z.literal('v2'),
  z.literal('raw'),
  z.literal('rawEnv'),
  z.literal('no-passes')
]);
export type ReporterVersion = z.infer<typeof ReporterVersionSchema>;

export const RunOnlyTypeSchema = z.union([
  z.literal('rule'),
  z.literal('rules'),
  z.literal('tag'),
  z.literal('tags')
]);
export type RunOnlyType = z.infer<typeof RunOnlyTypeSchema>;

export const ResultGroupsSchema = z.union([
  z.literal('inapplicable'),
  z.literal('passes'),
  z.literal('incomplete'),
  z.literal('violations')
]);
export type ResultGroups = z.infer<typeof ResultGroupsSchema>;

// RunOnly
export const RunOnlySchema = z.object({
  type: RunOnlyTypeSchema,
  values: z.array(z.string())
});
export type RunOnly = z.infer<typeof RunOnlySchema>;

// RuleObject
export const RuleObjectSchema = z.record(
  z.string(),
  z.object({ enabled: z.boolean() })
);
export type RuleObject = z.infer<typeof RuleObjectSchema>;

// PreloadOptions
export const PreloadOptionsSchema = z.object({
  assets: z.array(z.string()),
  timeout: z.optional(z.number())
});
export type PreloadOptions = z.infer<typeof PreloadOptionsSchema>;

// RunOptions
export const RunOptionsSchema = z.object({
  runOnly: z.optional(
    z.union([RunOnlySchema, z.array(z.string()), z.string()])
  ),
  rules: z.optional(RuleObjectSchema),
  reporter: z.optional(z.string()),
  resultTypes: z.optional(z.array(ResultGroupsSchema)),
  selectors: z.optional(z.boolean()),
  ancestry: z.optional(z.boolean()),
  xpath: z.optional(z.boolean()),
  absolutePaths: z.optional(z.boolean()),
  iframes: z.optional(z.boolean()),
  elementRef: z.optional(z.boolean()),
  frameWaitTime: z.optional(z.number()),
  preload: z.optional(z.union([z.boolean(), PreloadOptionsSchema])),
  performanceTimer: z.optional(z.boolean()),
  pingWaitTime: z.optional(z.number())
});
export type RunOptions = z.infer<typeof RunOptionsSchema>;

// NormalizedRunOptions - runOnly is always the object form
export const NormalizedRunOptionsSchema = RunOptionsSchema.extend({
  runOnly: z.optional(RunOnlySchema)
});
export type NormalizedRunOptions = z.infer<typeof NormalizedRunOptionsSchema>;
