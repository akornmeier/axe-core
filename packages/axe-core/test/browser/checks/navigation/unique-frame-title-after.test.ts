import { createMockCheckContext, checks } from '../../_helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
/*eslint indent: 0*/
describe('unique-frame-title-after', () => {
  var checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
  });

  it('should remove any check whose data only appears once', () => {
    var result = checks['unique-frame-title'].after([
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
