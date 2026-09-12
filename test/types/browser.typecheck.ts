import type { SessionClient } from "../../src/contracts.js";
export type BrowserConsumer = { readonly client: SessionClient; readonly root: Document };
// @ts-expect-error - browser scope must not acquire Node globals
export const noNode = process;
// @ts-expect-error - browser scope must not resolve Node builtins
export type NoNodeImport = typeof import("node:fs");
