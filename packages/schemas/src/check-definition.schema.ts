import { z } from 'zod';
import { ImpactValueSchema } from './options.schema.js';
import { CheckMessagesSchema } from './locale.schema.js';
import { SerialDqElementSchema } from './results.schema.js';

// CheckHelper - runtime helper passed as `this` to check evaluate functions
export const CheckHelperSchema = z.object({
  async: z.function(),
  data: z.function(),
  relatedNodes: z.function()
});
export type CheckHelper = z.infer<typeof CheckHelperSchema>;

// AfterResult - result shape passed to check after functions
export const AfterResultSchema = z.object({
  id: z.string(),
  data: z.optional(z.unknown()),
  relatedNodes: z.array(SerialDqElementSchema),
  result: z.union([z.boolean(), z.undefined()]),
  node: SerialDqElementSchema
});
export type AfterResult = z.infer<typeof AfterResultSchema>;

// CheckDefinition (maps to the Check interface)
export const CheckDefinitionSchema = z.object({
  id: z.string(),
  evaluate: z.optional(
    z.union([z.string(), z.function()])
  ),
  after: z.optional(
    z.union([z.string(), z.function()])
  ),
  options: z.optional(z.unknown()),
  matches: z.optional(z.string()),
  enabled: z.optional(z.boolean()),
  metadata: z.optional(
    z.object({
      impact: z.optional(ImpactValueSchema),
      messages: z.optional(CheckMessagesSchema)
    })
  )
});
export type CheckDefinition = z.infer<typeof CheckDefinitionSchema>;
