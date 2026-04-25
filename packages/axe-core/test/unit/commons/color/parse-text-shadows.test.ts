// FIXME(phase-01-followup): blocked by axe-global transitive deps in lib/commons/color/parse-text-shadows.ts.
// Importing the leaf module pulls in lib/core/utils/memoize.ts which references the
// runtime `axe` global. Re-enable once Phase 1 finishes porting these utils to pure ESM
// (or the test moves to test/browser/commons/ where axe runtime is available).
import { describe, it } from 'vitest';

describe.todo('color.parseTextShadows', () => {
  it.todo(
    'migrated from test/commons/color/parse-text-shadows.js — restore body once Phase 1 gap closed'
  );
});
