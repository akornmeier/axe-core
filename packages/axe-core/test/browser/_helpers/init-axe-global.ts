// Must run BEFORE lib/index.ts evaluation so `lib/core/public/load.ts`'s
// `axe._audit = ...` write has a target. ESM evaluation order: this file
// is imported first by check-helpers.ts, so its body runs to completion
// before lib/index.ts begins evaluating.
(globalThis as { axe?: Record<string, unknown> }).axe ??= {};

// `lib/index.ts` references `__AXE_VERSION__`, a Vite `define` substitution
// applied at production-build time. Vitest's transform pipeline does not
// reliably substitute the define for browser-mode source modules under Vitest
// 4.1, so we expose the symbol as a runtime global as a belt-and-suspenders
// fallback. This costs nothing at runtime (the production build still rewrites
// the literal at compile time) but keeps the Vitest path green.
declare global {
  // eslint-disable-next-line no-var
  var __AXE_VERSION__: string;
}
if (
  typeof (globalThis as { __AXE_VERSION__?: string }).__AXE_VERSION__ ===
  'undefined'
) {
  // The version literal is intentionally inlined so this file has no I/O at
  // import time; it is hand-mirrored to packages/axe-core/package.json.
  (globalThis as { __AXE_VERSION__: string }).__AXE_VERSION__ = '4.11.1';
}
export {};
