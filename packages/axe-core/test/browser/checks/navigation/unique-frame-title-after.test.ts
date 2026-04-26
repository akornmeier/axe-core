import { createMockCheckContext } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import { describe, it, expect, afterEach } from 'vitest';
/*eslint indent: 0*/
const audit = createSyntheticAudit(['unique-frame-title']);

describe('unique-frame-title-after', () => {
  const checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
  });

  it('should remove any check whose data only appears once', () => {
    const result = audit.checks['unique-frame-title'].after([
      {
        data: 'bananas'
      },
      {
        data: 'monkeys'
      },
      {
        data: 'bananas'
      },
      {
        data: 'apples'
      },
      {
        data: 'monkeys'
      }
    ]);

    expect(result).toEqual([
      {
        data: 'bananas',
        result: true
      },
      {
        data: 'monkeys',
        result: true
      },
      {
        data: 'bananas',
        result: true
      },
      {
        data: 'apples',
        result: false
      },
      {
        data: 'monkeys',
        result: true
      }
    ]);
  });
});
