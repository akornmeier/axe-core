// Global Vitest setup — registered via `setupFiles` in `vitest.config.ts`.
//
// Responsibilities:
//   1. Per-test fixture container lifecycle (DOM-bearing projects only).
//      Each test gets its OWN `<div id="fixture">` keyed off `ctx.task.id`,
//      so Vitest's parallel runner cannot leak DOM state between tests.
//      See specs/PRD-03-test-infrastructure-modernization.md §5.5.
//   2. Generic Zod schema matcher `toMatchSchema(schema)` backed by
//      `@axe-core/schemas`. Sprint 2/3 tests use it like:
//          expect(result).toMatchSchema(AxeResultsSchema);
//
// Playwright trace upload hooks are intentionally NOT wired here — task 15
// (CI workflow) handles trace artifact upload at the GitHub Actions layer.
//
// Phase 3, Task 3.

import { afterEach, beforeEach, expect } from 'vitest';
import type { ZodTypeAny } from 'zod';

declare global {
  // eslint-disable-next-line no-var
  var __axeFixture: HTMLElement | undefined;
}

// --- Per-test fixture container lifecycle ---------------------------------
//
// `document` is undefined under the `unit` (Node) project; the early return
// is what scopes this hook to the browser/integration projects without
// having to read Vitest's project name.
beforeEach(ctx => {
  if (typeof document === 'undefined') {
    return;
  }
  const el = document.createElement('div');
  el.id = 'fixture';
  el.dataset.testFixture = ctx.task.id;
  document.body.appendChild(el);
  globalThis.__axeFixture = el;
});

afterEach(() => {
  if (typeof document === 'undefined') {
    return;
  }
  globalThis.__axeFixture?.remove();
  globalThis.__axeFixture = undefined;
});

// --- Zod schema matcher ---------------------------------------------------
expect.extend({
  toMatchSchema(received: unknown, schema: ZodTypeAny) {
    const result = schema.safeParse(received);
    if (result.success) {
      return {
        pass: true,
        message: () => 'expected value not to match schema'
      };
    }
    return {
      pass: false,
      message: () =>
        `expected value to match schema:\n${JSON.stringify(
          result.error.issues,
          null,
          2
        )}`
    };
  }
});

// Note: Vitest's `Assertion<T>` defaults `T = any`. Matching that exactly
// is required — TypeScript flags `T = unknown` as a generic-parameter mismatch.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toMatchSchema(schema: ZodTypeAny): T;
  }
  interface AsymmetricMatchersContaining {
    toMatchSchema(schema: ZodTypeAny): unknown;
  }
}
