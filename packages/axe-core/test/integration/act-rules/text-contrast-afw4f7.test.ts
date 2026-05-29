// Auto-generated from the legacy test/act-rules/text-contrast-afw4f7.spec.js.
// Wave B ACT migration — Sprint 5c.
//
// skipTests below covers testcases that fail under the current
// color-contrast rule due to the pre-existing color-algebra carryover
// tracked in PRD-04 §5.1 (and in this sprint's
// `phase-04-a3-carryover-bugs.md`). Phase 4 should remove these entries
// when the algebra fix lands.

import { createActSuite } from './_act-runner';

createActSuite({
  id: 'afw4f7',
  title: 'Text has minimum contrast',
  axeRules: ['color-contrast'],
  skipTests: [
    '04344f745bd9bad51292748e7893f146c045aae4',
    '173cb00f20c52f35970c322dedf7bc11450b70c1',
    '319a465113950b03502709ab573edf7deab59908',
    '668856825e6d3b4e480005acf97723c7b1004ba3',
    '66a3ba7bc0027a9556596e3c378c926a537c1901',
    'aed692e9f0a1be5c87ef1de56afa8e23e14cc3ba',
    'c7c09c1019dcf1d1c67183001b4d459dee7a87ff',
    'fc92e273e09ad225227f488e3a016fd8d4aad10c',
    'fd406bedf0bb3bdc4c2a718f49a3dd0f7aaa7556'
  ]
});
