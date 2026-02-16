import { z } from 'zod';

// BaseSelector: a CSS selector string
export const BaseSelectorSchema = z.string();
export type BaseSelector = z.infer<typeof BaseSelectorSchema>;

// ShadowDomSelector: array of at least 2 strings [string, string, ...string[]]
export const ShadowDomSelectorSchema = z.tuple([z.string(), z.string()]).rest(
  z.string()
);
export type ShadowDomSelector = z.infer<typeof ShadowDomSelectorSchema>;

// CrossTreeSelector: string | ShadowDomSelector
export const CrossTreeSelectorSchema = z.union([
  BaseSelectorSchema,
  ShadowDomSelectorSchema
]);
export type CrossTreeSelector = z.infer<typeof CrossTreeSelectorSchema>;

// LabelledShadowDomSelector: { fromShadowDom: ShadowDomSelector }
export const LabelledShadowDomSelectorSchema = z.object({
  fromShadowDom: ShadowDomSelectorSchema
});
export type LabelledShadowDomSelector = z.infer<
  typeof LabelledShadowDomSelectorSchema
>;

// FramesSelector: Array<CrossTreeSelector | LabelledShadowDomSelector>
export const FramesSelectorSchema = z.array(
  z.union([CrossTreeSelectorSchema, LabelledShadowDomSelectorSchema])
);
export type FramesSelector = z.infer<typeof FramesSelectorSchema>;

// UnlabelledFrameSelector: CrossTreeSelector[]
export const UnlabelledFrameSelectorSchema = z.array(CrossTreeSelectorSchema);
export type UnlabelledFrameSelector = z.infer<
  typeof UnlabelledFrameSelectorSchema
>;

// LabelledFramesSelector: { fromFrames: MultiArray of FramesSelector entries }
const FramesSelectorEntrySchema = z.union([
  CrossTreeSelectorSchema,
  LabelledShadowDomSelectorSchema
]);

export const LabelledFramesSelectorSchema = z.object({
  fromFrames: z
    .tuple([FramesSelectorEntrySchema, FramesSelectorEntrySchema])
    .rest(FramesSelectorEntrySchema)
});
export type LabelledFramesSelector = z.infer<
  typeof LabelledFramesSelectorSchema
>;

// SerialSelector: BaseSelector | LabelledShadowDomSelector | LabelledFramesSelector
export const SerialSelectorSchema = z.union([
  BaseSelectorSchema,
  LabelledShadowDomSelectorSchema,
  LabelledFramesSelectorSchema
]);
export type SerialSelector = z.infer<typeof SerialSelectorSchema>;

// SerialFrameSelector: SerialSelector | FramesSelector
export const SerialFrameSelectorSchema = z.union([
  SerialSelectorSchema,
  FramesSelectorSchema
]);
export type SerialFrameSelector = z.infer<typeof SerialFrameSelectorSchema>;

// SerialSelectorList: Array<SerialFrameSelector>
export const SerialSelectorListSchema = z.array(SerialFrameSelectorSchema);
export type SerialSelectorList = z.infer<typeof SerialSelectorListSchema>;

// SerialContextObject: either include required or exclude required
export const SerialContextObjectSchema = z.union([
  z.object({
    include: z.union([SerialSelectorSchema, SerialSelectorListSchema]),
    exclude: z.optional(
      z.union([SerialSelectorSchema, SerialSelectorListSchema])
    )
  }),
  z.object({
    exclude: z.union([SerialSelectorSchema, SerialSelectorListSchema]),
    include: z.optional(
      z.union([SerialSelectorSchema, SerialSelectorListSchema])
    )
  })
]);
export type SerialContextObject = z.infer<typeof SerialContextObjectSchema>;

// FrameContextObject
export const FrameContextObjectSchema = z.object({
  include: z.array(UnlabelledFrameSelectorSchema),
  exclude: z.array(UnlabelledFrameSelectorSchema)
});
export type FrameContextObject = z.infer<typeof FrameContextObjectSchema>;
