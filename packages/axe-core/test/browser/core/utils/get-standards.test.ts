import { axe } from '@helpers/check-helpers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
describe('axe.utils.getStandards', function () {
  it('returns the standards object', function () {
    var standards = axe.utils.getStandards();
    expect(
      [...['ariaAttrs', 'ariaRoles', 'htmlElms', 'cssColors']].some(__k =>
        Object.prototype.hasOwnProperty.call(standards, __k)
      )
    ).toBe(true);
  });
});
