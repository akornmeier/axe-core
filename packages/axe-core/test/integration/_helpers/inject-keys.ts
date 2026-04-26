// Single source of truth for Vitest `provide`/`inject` keys used by the
// integration harness. This file is dependency-free so it can be imported
// from both the Node-side `global-setup.ts` and the browser-side
// `load-fixture.ts` without dragging Node built-ins into the browser bundle.
//
// Phase 3, Sprint 5c — Wave A harness.

export const FIXTURE_URL_KEY = 'axeFixtureUrl' as const;
