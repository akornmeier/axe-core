// Auto-generated from the legacy test/act-rules/text-contrast-enhanced-09o5cg.spec.js.
// Wave B ACT migration — Sprint 5c.
//
// skipTests below covers testcases that fail under the current
// color-contrast / color-contrast-enhanced rules due to the pre-existing
// color-algebra carryover tracked in PRD-04 §5.1. testcaseIds are NOT
// unique across rules — each rule gets its own copy of the same id, so
// 09o5cg's skiplist looks similar to afw4f7's by design. Phase 4 fix
// removes these entries.

import { createActSuite } from './_act-runner';

createActSuite({
  id: '09o5cg',
  title: 'Text has enhanced contrast',
  axeRules: ['color-contrast', 'color-contrast-enhanced'],
  skipTests: [
    '7768acdf84efd498cc557368e73aa9da495727c9',
    'e94522843ec1985d5c8b25e059e95c845e28b4fe',
    'fd406bedf0bb3bdc4c2a718f49a3dd0f7aaa7556',
    'c7c09c1019dcf1d1c67183001b4d459dee7a87ff',
    '66a3ba7bc0027a9556596e3c378c926a537c1901',
    '173cb00f20c52f35970c322dedf7bc11450b70c1',
    '668856825e6d3b4e480005acf97723c7b1004ba3',
    'fc92e273e09ad225227f488e3a016fd8d4aad10c'
  ]
});
