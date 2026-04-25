// Pilot migration of `test/commons/utils/index.js` to Vitest's `unit` project.
//
// Phase 3, Task 4 — proves the import-from-source pattern. The legacy file
// reaches the same functions through `axe.commons.utils.foo`; here we import
// directly from `lib/core/utils/` to validate the strangler-fig pattern that
// Sprint 2/3 will apply in bulk. The original `.js` file is left in place and
// continues to run under Karma until task #16 deletes it.
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.1.
import { describe, expect, it } from 'vitest';
import clone from '../../../../lib/core/utils/clone';
import escapeSelector from '../../../../lib/core/utils/escape-selector';
import matchesSelector from '../../../../lib/core/utils/element-matches';

describe('utils.escapeSelector', () => {
  it('should be a function', () => {
    expect(typeof escapeSelector).toBe('function');
  });
});

describe('utils.matchesSelector', () => {
  it('should be a function', () => {
    expect(typeof matchesSelector).toBe('function');
  });
});

describe('utils.clone', () => {
  it('should be a function', () => {
    expect(typeof clone).toBe('function');
  });
});
