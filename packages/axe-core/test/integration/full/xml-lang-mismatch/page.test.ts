// Auto-generated full-suite migration — Wave B Sprint 5c.
// Drives the inline-mocha fixture pages in this directory through the
// page-fixture-runner. The .js fixture content is unchanged.

import { describe, it } from 'vitest';
import {
  assertNoFixtureFailures,
  runPageFixture
} from '../../_helpers/page-fixture-runner';

const pages: string[] = [
  'xml-lang-mismatch.fail1.html',
  'xml-lang-mismatch.fail2.html',
  'xml-lang-mismatch.inapplicable1.html',
  'xml-lang-mismatch.inapplicable2.html',
  'xml-lang-mismatch.pass1.html',
  'xml-lang-mismatch.pass2.html',
  'xml-lang-mismatch.pass3.html',
  'xml-lang-mismatch.pass4.html',
  'xml-lang-mismatch.pass5.html'
];

describe('integration/full/xml-lang-mismatch', () => {
  if (pages.length > 0) {
    it.each(pages)('%s', { timeout: 60_000, retry: 1 }, async page => {
      const fixture = `/test/integration/full/xml-lang-mismatch/${page}`;
      const results = await runPageFixture(fixture);
      assertNoFixtureFailures(fixture, results);
    });
  }
});
