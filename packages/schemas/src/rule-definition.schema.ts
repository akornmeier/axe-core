import { z } from 'zod';
import { ImpactValueSchema } from './options.schema.js';

// RuleDefinition (maps to the Rule interface)
export const RuleDefinitionSchema = z.object({
  id: z.string(),
  selector: z.optional(z.string()),
  impact: z.optional(ImpactValueSchema),
  excludeHidden: z.optional(z.boolean()),
  enabled: z.optional(z.boolean()),
  pageLevel: z.optional(z.boolean()),
  any: z.optional(z.array(z.string())),
  all: z.optional(z.array(z.string())),
  none: z.optional(z.array(z.string())),
  tags: z.optional(z.array(z.string())),
  matches: z.optional(z.union([z.string(), z.function()])),
  reviewOnFail: z.optional(z.boolean()),
  actIds: z.optional(z.array(z.string())),
  metadata: z.optional(
    z.object({
      description: z.string(),
      help: z.string(),
      helpUrl: z.optional(z.string())
    })
  )
});
export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
