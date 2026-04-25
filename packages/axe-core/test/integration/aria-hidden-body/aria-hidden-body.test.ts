// Pilot integration test for the `aria-hidden-body` rule.
//
// The legacy harness (`test/integration/full/aria-hidden-body/fail.html` +
// `fail.js`) stands up a full HTML page with iframes, mocha-in-page, and
// a Selenium adapter that posts results back. Reproducing that for the
// pilot would require the JSON-driver framework that task #11 builds.
// For Sprint 1 we exercise the same RULE end-to-end with a hand-written
// fixture: inject HTML into the iframe, call `axe.run`, and assert the
// expected rule fires (or doesn't).
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.
// TODO(Sprint 3 task #11): replace with the JSON-driver framework.
import { afterEach, describe, expect, it } from 'vitest';
import '../../../dist/axe.js';

const axe = (
  globalThis as unknown as {
    axe: { run: (ctx: unknown, opts: unknown) => Promise<any> };
  }
).axe;

describe('integration: aria-hidden-body', () => {
  afterEach(() => {
    document.body.removeAttribute('aria-hidden');
    document.body.innerHTML = '';
  });

  it('flags a violation when <body aria-hidden="true">', async () => {
    document.body.setAttribute('aria-hidden', 'true');
    document.body.innerHTML =
      '<h2>Some title.</h2><a href="https://www.deque.com">Deque</a>';

    const results = await axe.run(document.body, {
      runOnly: { type: 'rule', values: ['aria-hidden-body'] }
    });

    const violationIds = results.violations.map((v: { id: string }) => v.id);
    expect(violationIds).toContain('aria-hidden-body');
    expect(results.violations).toHaveLength(1);
  });

  it('passes the same rule when aria-hidden is not set on body', async () => {
    document.body.innerHTML =
      '<h2>Some title.</h2><a href="https://www.deque.com">Deque</a>';

    const results = await axe.run(document.body, {
      runOnly: { type: 'rule', values: ['aria-hidden-body'] }
    });

    expect(results.violations).toHaveLength(0);
  });
});
