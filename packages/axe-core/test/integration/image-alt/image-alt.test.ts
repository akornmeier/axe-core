// Pilot integration test for the `image-alt` rule.
//
// Pairs with `aria-hidden-body.test.ts` to give the integration project two
// independent rule end-to-ends in Sprint 1. This rule was picked because
// it is one of the most popular axe rules and has zero scaffolding cost
// (no iframes, no <title>, no Selenium harness needed).
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.
// TODO(Sprint 3 task #11): fold into the JSON-driver framework once it lands.
import { afterEach, describe, expect, it } from 'vitest';
import '../../../dist/axe.js';

const axe = (
  globalThis as unknown as {
    axe: { run: (ctx: unknown, opts: unknown) => Promise<any> };
  }
).axe;

describe('integration: image-alt', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('flags <img> without alt as a violation', async () => {
    document.body.innerHTML =
      '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />';

    const results = await axe.run(document.body, {
      runOnly: { type: 'rule', values: ['image-alt'] }
    });

    const violationIds = results.violations.map((v: { id: string }) => v.id);
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
