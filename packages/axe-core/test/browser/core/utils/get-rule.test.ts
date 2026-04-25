import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from '@helpers/check-helpers';

describe('axe.utils.getRule', function () {
  beforeEach(function () {
    axe._load({
      rules: [
        {
          id: 'rule1'
        },
        {
          id: 'rule2'
        }
      ]
    });
  });

  it('should return the rule by the id', function () {
    const rule = axe.utils.getRule('rule1');
    expect(rule.id === 'rule1').toBe(true);
  });

  it("should throw error if the rule doesn't exist", function () {
    expect(function () {
      axe.utils.getRule('no-id');
    }).toThrow();
  });
});
