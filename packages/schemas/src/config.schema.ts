import { z } from 'zod';
import { ReporterVersionSchema } from './options.schema.js';
import { LocaleSchema } from './locale.schema.js';
import { StandardsSchema } from './aria.schema.js';
import { CheckDefinitionSchema } from './check-definition.schema.js';
import { RuleDefinitionSchema } from './rule-definition.schema.js';

// Branding
export const BrandingSchema = z.object({
  brand: z.optional(z.string()),
  application: z.optional(z.string())
});
export type Branding = z.infer<typeof BrandingSchema>;

// AxeConfiguration (maps to Spec interface)
export const AxeConfigurationSchema = z.object({
  branding: z.optional(z.union([z.string(), BrandingSchema])),
  reporter: z.optional(
    z.union([ReporterVersionSchema, z.string(), z.function()])
  ),
  checks: z.optional(z.array(CheckDefinitionSchema)),
  rules: z.optional(z.array(RuleDefinitionSchema)),
  standards: z.optional(StandardsSchema),
  locale: z.optional(LocaleSchema),
  disableOtherRules: z.optional(z.boolean()),
  axeVersion: z.optional(z.string()),
  noHtml: z.optional(z.boolean()),
  allowedOrigins: z.optional(z.array(z.string())),
  ver: z.optional(z.string())
});
export type AxeConfiguration = z.infer<typeof AxeConfigurationSchema>;
