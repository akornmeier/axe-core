// Auto-generated full-suite migration — Wave B Sprint 5c.
// Drives the inline-mocha fixture pages in this directory through the
// page-fixture-runner. The .js fixture content is unchanged.

import { describe, it } from 'vitest';
import {
  assertNoFixtureFailures,
  runPageFixture
} from '../../_helpers/page-fixture-runner';

const pages: string[] = [
  'landmark-contentinfo-is-top-level-fail.html',
  'landmark-contentinfo-is-top-level-pass.html'
];

describe('integration/full/landmark-contentinfo-is-top-level', () => {
  if (pages.length > 0) {
    it.each(pages)('%s', { timeout: 60_000, retry: 1 }, async page => {
      const fixture = `/test/integration/full/landmark-contentinfo-is-top-level/${page}`;
      const results = await runPageFixture(fixture);
      assertNoFixtureFailures(fixture, results);
    });
  }
});
