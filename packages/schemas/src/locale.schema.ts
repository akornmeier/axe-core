import { z } from 'zod';

// CheckMessages
export const CheckMessagesSchema = z.object({
  pass: z.union([z.string(), z.record(z.string(), z.string())]),
  fail: z.union([z.string(), z.record(z.string(), z.string())]),
  incomplete: z.optional(
    z.union([z.string(), z.record(z.string(), z.string())])
  )
});
export type CheckMessages = z.infer<typeof CheckMessagesSchema>;

// RuleLocale
export const RuleLocaleSchema = z.record(
  z.string(),
  z.object({
    description: z.string(),
    help: z.string()
  })
);
export type RuleLocale = z.infer<typeof RuleLocaleSchema>;

// CheckLocale
export const CheckLocaleSchema = z.record(z.string(), CheckMessagesSchema);
export type CheckLocale = z.infer<typeof CheckLocaleSchema>;

// Locale
export const LocaleSchema = z.object({
  lang: z.optional(z.string()),
  rules: z.optional(RuleLocaleSchema),
  checks: z.optional(CheckLocaleSchema)
});
export type Locale = z.infer<typeof LocaleSchema>;
