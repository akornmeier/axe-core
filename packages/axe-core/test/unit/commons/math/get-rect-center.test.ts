// FIXME(phase-01-followup): getRectCenter returns `new window.DOMPoint(...)`
// which jsdom does not implement (only DOMRect). Re-route to test/browser/commons/
// in task #11 where Playwright provides a real DOMPoint constructor.
import { describe, it } from 'vitest';

describe.todo('getRectCenter', () => {
  it.todo(
    'returns the center point of a rect — needs real DOMPoint (browser project)'
  );
});
