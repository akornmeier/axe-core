// Auto-generated full-suite migration — Wave B Sprint 5c.
// Drives the inline-mocha fixture pages in this directory through the
// page-fixture-runner. The .js fixture content is unchanged.

import { describe, it } from 'vitest';
import {
  assertNoFixtureFailures,
  runPageFixture
} from '../../_helpers/page-fixture-runner';

const pages: string[] = [];

// Phase 4 carryover (see phase-04-a3-carryover-bugs.md): these fixtures
// produce real mocha assertion failures under the migrated harness.
const knownFailingPages: string[] = ['isolated-env.html'];

describe('integration/full/isolated-env', () => {
  if (pages.length > 0) {
    it.each(pages)('%s', { timeout: 60_000, retry: 1 }, async page => {
      const fixture = `/test/integration/full/isolated-env/${page}`;
      const results = await runPageFixture(fixture);
      assertNoFixtureFailures(fixture, results);
    });
  }
  it.todo.each(knownFailingPages)(
    '%s — Phase 4 carryover (assertion drift, see phase-04-a3-carryover-bugs.md)'
  );
});
