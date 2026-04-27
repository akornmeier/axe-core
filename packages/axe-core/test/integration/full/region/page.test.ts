// Auto-generated full-suite migration — Wave B Sprint 5c.
// Drives the inline-mocha fixture pages in this directory through the
// page-fixture-runner. The .js fixture content is unchanged.

import { describe, it } from 'vitest';
import {
  assertNoFixtureFailures,
  runPageFixture
} from '../../_helpers/page-fixture-runner';

const pages: string[] = [
  'region-fail-iframe.html',
  'region-fail-nested-iframe.html',
  'region-fail.html',
  'region-iframe-with-landmarks.html',
  'region-iframe-within-landmark.html',
  'region-pass-nested-iframe.html',
  'region-pass.html'
];

describe('integration/full/region', () => {
  if (pages.length > 0) {
    it.each(pages)('%s', { timeout: 60_000, retry: 1 }, async page => {
      const fixture = `/test/integration/full/region/${page}`;
      const results = await runPageFixture(fixture);
      assertNoFixtureFailures(fixture, results);
    });
  }
});
