// Pilot integration test for the `aria-hidden-body` rule.
//
// Validates Wave A's harness end-to-end: `loadAxe()` fetches the built
// `dist/axe.js` from the fixture server and attaches it to `window.axe`.
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadAxe, type AxeApi } from '../_helpers/load-fixture';

describe('integration: aria-hidden-body', () => {
  let axe: AxeApi;

  beforeAll(async () => {
    axe = await loadAxe();
  });

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

    const violationIds = results.violations.map(v => v.id);
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
