// Smoke test for the Wave A harness. Drives one page-style fixture from
// `test/integration/full/` end-to-end through `runPageFixture`, asserting
// that the iframe loads, axe runs, the in-page mocha adapter posts results
// back, and the runner reports zero failures. If this test goes red, the
// Wave A harness is broken — every Wave B migration depends on it.
//
// Phase 3, Sprint 5c — Wave A harness.

import { describe, expect, it } from 'vitest';
import { assertNoFixtureFailures, runPageFixture } from './page-fixture-runner';

describe('harness smoke — runPageFixture', () => {
  it('drives integration/full/aria-hidden-body/fail.html to passing mocha results', async () => {
    const results = await runPageFixture(
      '/test/integration/full/aria-hidden-body/fail.html'
    );

    expect(results.passes).toBeGreaterThan(0);
    expect(results.failures).toBe(0);
    assertNoFixtureFailures(
      '/test/integration/full/aria-hidden-body/fail.html',
      results
    );
  }, 60_000);
});
