// Auto-generated full-suite migration — Wave B Sprint 5c.
// Drives the inline-mocha fixture pages in this directory through the
// page-fixture-runner. The .js fixture content is unchanged.

import { describe, it } from 'vitest';
import {
  assertNoFixtureFailures,
  runPageFixture
} from '../../_helpers/page-fixture-runner';

const pages: string[] = [
  'page-has-heading-one-fail.html',
  'page-has-heading-one-pass1.html',
  'page-has-heading-one-pass10.html',
  'page-has-heading-one-pass2.html',
  'page-has-heading-one-pass3.html',
  'page-has-heading-one-pass4.html',
  'page-has-heading-one-pass5.html',
  'page-has-heading-one-pass6.html',
  'page-has-heading-one-pass7.html',
  'page-has-heading-one-pass8.html',
  'page-has-heading-one-pass9.html'
];

describe('integration/full/page-has-heading-one', () => {
  if (pages.length > 0) {
    it.each(pages)('%s', { timeout: 60_000, retry: 1 }, async page => {
      const fixture = `/test/integration/full/page-has-heading-one/${page}`;
      const results = await runPageFixture(fixture);
      assertNoFixtureFailures(fixture, results);
    });
  }
});
