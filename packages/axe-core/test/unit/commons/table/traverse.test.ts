// FIXME(phase-01-followup): legacy traverse test relies on the Karma `fixture`
// global and shadows vitest's `expect` import with a data array (`var expect = [...]`).
// Re-route to test/browser/commons/table/ in task #11 once the fixture helper
// is in place; the body is preserved in the original test/commons/table/traverse.js.
import { describe, it } from 'vitest';

describe.todo('table.traverse', () => {
  it.todo(
    'migrated from test/commons/table/traverse.js — restore body in browser project'
  );
});
