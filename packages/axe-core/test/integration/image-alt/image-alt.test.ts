// Pilot integration test for the `image-alt` rule.
//
// Validates Wave A's harness end-to-end: `loadAxe()` fetches the built
// `dist/axe.js` from the fixture server and attaches it to `window.axe`.
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadAxe, type AxeApi } from '../_helpers/load-fixture';

describe('integration: image-alt', () => {
  let axe: AxeApi;

  beforeAll(async () => {
    axe = await loadAxe();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('flags <img> without alt as a violation', async () => {
    document.body.innerHTML =
      '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />';

    const results = await axe.run(document.body, {
      runOnly: { type: 'rule', values: ['image-alt'] }
    });

    const violationIds = results.violations.map(v => v.id);
    expect(violationIds).toContain('image-alt');
  });

  it('does not flag <img alt="...">', async () => {
    document.body.innerHTML =
      '<img alt="logo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />';

    const results = await axe.run(document.body, {
      runOnly: { type: 'rule', values: ['image-alt'] }
    });

    expect(results.violations).toHaveLength(0);
  });
});
