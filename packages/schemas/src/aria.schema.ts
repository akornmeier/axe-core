import { z } from 'zod';

// AriaAttrsType
export const AriaAttrsTypeSchema = z.union([
  z.literal('boolean'),
  z.literal('nmtoken'),
  z.literal('mntokens'),
  z.literal('idref'),
  z.literal('idrefs'),
  z.literal('string'),
  z.literal('decimal'),
  z.literal('int')
]);
export type AriaAttrsType = z.infer<typeof AriaAttrsTypeSchema>;

// AriaRolesType
export const AriaRolesTypeSchema = z.union([
  z.literal('abstract'),
  z.literal('widget'),
  z.literal('structure'),
  z.literal('landmark')
]);
export type AriaRolesType = z.infer<typeof AriaRolesTypeSchema>;

// DpubRolesType
export const DpubRolesTypeSchema = z.union([
  z.literal('section'),
  z.literal('landmark'),
  z.literal('link'),
  z.literal('listitem'),
  z.literal('img'),
  z.literal('navigation'),
  z.literal('note'),
  z.literal('separator'),
  z.literal('none'),
  z.literal('sectionhead')
]);
export type DpubRolesType = z.infer<typeof DpubRolesTypeSchema>;

// HtmlContentTypes
export const HtmlContentTypesSchema = z.union([
  z.literal('flow'),
  z.literal('sectioning'),
  z.literal('heading'),
  z.literal('phrasing'),
  z.literal('embedded'),
  z.literal('interactive')
]);
export type HtmlContentTypes = z.infer<typeof HtmlContentTypesSchema>;

// AriaAttrs
export const AriaAttrsSchema = z.object({
  type: AriaAttrsTypeSchema,
  values: z.optional(z.array(z.string())),
  allowEmpty: z.optional(z.boolean()),
  global: z.optional(z.boolean()),
  unsupported: z.optional(z.boolean())
});
export type AriaAttrs = z.infer<typeof AriaAttrsSchema>;

// AriaRoles
export const AriaRolesSchema = z.object({
  type: z.union([AriaRolesTypeSchema, DpubRolesTypeSchema]),
  requiredContext: z.optional(z.array(z.string())),
  requiredOwned: z.optional(z.array(z.string())),
  requiredAttrs: z.optional(z.array(z.string())),
  allowedAttrs: z.optional(z.array(z.string())),
  nameFromContent: z.optional(z.boolean()),
  unsupported: z.optional(z.boolean())
});
export type AriaRoles = z.infer<typeof AriaRolesSchema>;

// HtmlElmsVariant
export const HtmlElmsVariantSchema = z.object({
  contentTypes: z.optional(z.array(HtmlContentTypesSchema)),
  allowedRoles: z.union([z.boolean(), z.array(z.string())]),
  noAriaAttrs: z.optional(z.boolean()),
  shadowRoot: z.optional(z.boolean()),
  implicitAttrs: z.optional(z.record(z.string(), z.string())),
  namingMethods: z.optional(z.array(z.string()))
});
export type HtmlElmsVariant = z.infer<typeof HtmlElmsVariantSchema>;

// HtmlElms (extends HtmlElmsVariant)
export const HtmlElmsSchema = HtmlElmsVariantSchema.extend({
  variant: z.optional(z.record(z.string(), HtmlElmsVariantSchema))
});
export type HtmlElms = z.infer<typeof HtmlElmsSchema>;

// Standards
export const StandardsSchema = z.object({
  ariaAttrs: z.optional(z.record(z.string(), AriaAttrsSchema)),
  ariaRoles: z.optional(z.record(z.string(), AriaRolesSchema)),
  htmlElms: z.optional(z.record(z.string(), HtmlElmsSchema)),
  cssColors: z.optional(z.record(z.string(), z.array(z.number())))
});
export type Standards = z.infer<typeof StandardsSchema>;
