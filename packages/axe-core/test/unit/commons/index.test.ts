// FIXME(phase-01-followup): the legacy index test asserts that the runtime
// `axe.commons.*` global is populated with each category namespace. That
// assertion only makes sense for the bundled runtime (browser project),
// not for direct ESM imports. Re-route in task #11 once `test/browser/commons/`
// has its smoke-test scaffolding.
import { describe, it } from 'vitest';

describe.todo('axe.commons', () => {
  it.todo(
    'should export public api — only meaningful in the bundled runtime; covered by browser project'
  );
});
