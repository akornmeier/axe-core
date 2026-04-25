// FIXME(phase-01-followup): blocked by axe-global transitive deps in lib/commons/aria/is-valid-role.ts.
// Importing the leaf module pulls in lib/core/utils/memoize.ts which references the
// runtime `axe` global. Re-enable once Phase 1 finishes porting these utils to pure ESM
// (or the test moves to test/browser/commons/ where axe runtime is available).
import { describe, it } from 'vitest';

describe.todo('aria.isValidRole', () => {
  it.todo(
    'migrated from test/commons/aria/is-valid-role.js — restore body once Phase 1 gap closed'
  );
});
