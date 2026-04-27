// Single source of truth for Vitest `provide`/`inject` keys used by the
// integration harness. This file is dependency-free so it can be imported
// from both the Node-side `global-setup.ts` and the browser-side
// `load-fixture.ts` without dragging Node built-ins into the browser bundle.
//
// Phase 3, Sprint 5c — Wave A harness.

export const FIXTURE_URL_KEY = 'axeFixtureUrl' as const;

/**
 * Cross-process value passing for fixture indices that require Node-side
 * filesystem access (glob, fs). Values are populated by `global-setup.ts`
 * and consumed by integration tests via `inject(...)`.
 */
export const APG_EXAMPLES_KEY = 'axeApgExamples' as const;

export const ACT_TESTCASES_KEY = 'axeActTestcases' as const;
