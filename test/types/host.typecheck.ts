import type { Buffer } from "node:buffer";
export type HostInput = Buffer;
// @ts-expect-error - host scope must not acquire ambient DOM types
export type NoDom = HTMLElement;
// @ts-expect-error - host scope cannot refer to a page document
export const noDocument = document;
