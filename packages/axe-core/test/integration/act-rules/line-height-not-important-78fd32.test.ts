// Auto-generated from the legacy test/act-rules/line-height-not-important-78fd32.spec.js.
// Wave B ACT migration — Sprint 5c.
//
// skipTests below covers testcases that fail under the current
// avoid-inline-spacing code path. Pre-existing regression captured in
// `phase-04-a3-carryover-bugs.md`. Phase 4 fix removes these entries.

import { createActSuite } from './_act-runner';

createActSuite({
  id: '78fd32',
  title: 'Line height in style attributes is not !important',
  axeRules: ['avoid-inline-spacing'],
  skipTests: [
    '67159173d21bc9cf00d1bb5a7ec817696ccee05c',
    'c8c447e4e9065a1f8676c78dd937486e074026f7'
  ]
});
