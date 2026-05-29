// Auto-generated full-suite migration — Wave B Sprint 5c.
// Drives the inline-mocha fixture pages in this directory through the
// page-fixture-runner. The .js fixture content is unchanged.

import { describe, it } from 'vitest';
import {
  assertNoFixtureFailures,
  runPageFixture
} from '../../_helpers/page-fixture-runner';

const pages: string[] = [
  'meta-refresh-fail1.html',
  'meta-refresh-inapplicable1.html',
  'meta-refresh-inapplicable2.html',
  'meta-refresh-pass1.html',
  'meta-refresh-pass2.html'
];

describe('integration/full/meta-refresh', () => {
  if (pages.length > 0) {
    it.each(pages)('%s', { timeout: 60_000, retry: 1 }, async page => {
      const fixture = `/test/integration/full/meta-refresh/${page}`;
      const results = await runPageFixture(fixture);
      assertNoFixtureFailures(fixture, results);
    });
  }
});
