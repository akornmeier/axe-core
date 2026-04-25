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
describe('axe.utils.aggregateChecks', function () {
  const FAIL = axe.constants.FAIL;
  const PASS = axe.constants.PASS;
  const CANTTELL = axe.constants.CANTTELL;
  const NA = axe.constants.NA;

  // create an object of check results, padding input with defaults and
  // wrapping arrays where required
  function createTestCheckResults(node) {
    ['any', 'all', 'none'].forEach(function (type) {
      if (typeof node[type] === 'undefined') {
        node[type] = [];
      } else if (Array.isArray(node[type])) {
        node[type] = node[type].map(function (val) {
          if (typeof val !== 'object') {
            return { result: val };
          } else {
            return val;
          }
        });
      } else {
        if (typeof node[type] !== 'object') {
          node[type] = { result: node[type] };
        }
        node[type] = [node[type]];
      }
    });
    return node;
  }

  beforeEach(function () {
    axe._load({});
  });

  it('should be a function', function () {
    expect(typeof axe.utils.aggregateChecks).toBe('function');
  });

  it('Should be `inapplicable` when no results are given', function () {
    const ruleResult = axe.utils.aggregateChecks(createTestCheckResults({}));

    expect(ruleResult.result).toBe(NA);
  });

  it('sets result  to cantTell when result is not a boolean', function () {
    const values = [undefined, null, 0, 'true', {}, NaN];
    values.forEach(function (value) {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: [{ result: value }]
        })
      );
      expect(checkResult.result).toBe(CANTTELL);
    });
  });

  it('returns impact for fail and canttell', function () {
    const failCheck = axe.utils.aggregateChecks(
      createTestCheckResults({
        any: [{ result: false, impact: 'serious' }]
      })
    );
    const canttellCheck = axe.utils.aggregateChecks(
      createTestCheckResults({
        any: [{ result: undefined, impact: 'moderate' }]
      })
    );

    expect(failCheck.impact).toBe('serious');
    expect(canttellCheck.impact).toBe('moderate');
  });

  it('sets impact to null for pass', function () {
    const passCheck = axe.utils.aggregateChecks(
      createTestCheckResults({
        any: [{ result: true, impact: 'serious' }]
      })
    );
    expect(passCheck.impact).toBeNull();
  });

  describe('none', function () {
    it('gives result FAIL when any is true', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          none: [false, true, undefined]
        })
      );

      expect(checkResult.result).toBe(FAIL);
    });

    it('gives result CANTTELL when none is true and any is not a boolean', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          none: [undefined, false]
        })
      );
      expect(checkResult.result).toBe(CANTTELL);
    });

    it('gives result PASS when all are FALSE', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          none: [false, false]
        })
      );
      expect(checkResult.result).toBe(PASS);
    });
  });

  describe('any', function () {
    it('gives result PASS when any is true', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: [undefined, true]
        })
      );
      expect(checkResult.result).toBe(PASS);
    });

    it('gives result CANTTELL when none is true and any is not a bool', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: [undefined, false]
        })
      );
      expect(checkResult.result).toBe(CANTTELL);
    });

    it('gives result FAIL when all are false', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: [false, false]
        })
      );
      expect(checkResult.result).toBe(FAIL);
    });
  });

  describe('all', function () {
    it('gives result FAIL when any is false', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          all: [false, true, undefined]
        })
      );

      expect(checkResult.result).toBe(FAIL);
    });

    it('gives result CANTTELL when none is false and any is not a boolean', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          all: [undefined, true]
        })
      );
      expect(checkResult.result).toBe(CANTTELL);
    });

    it('gives result PASS when all are true', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          all: [true, true]
        })
      );
      expect(checkResult.result).toBe(PASS);
    });
  });

  describe('combined', function () {
    it('gives result PASS when all are PASS', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: true,
          all: true,
          none: false
        })
      );

      expect(checkResult.result).toBe(PASS);
    });

    it('gives result CANTTELL when none is FAIL and any is CANTTELL', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: 0,
          all: true,
          none: false
        })
      );
      expect(checkResult.result).toBe(CANTTELL);
    });

    it('gives result FAIL when any are FAIL', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: 0,
          all: false,
          none: false
        })
      );
      expect(checkResult.result).toBe(FAIL);
    });

    it('ignores fail checks on any, if at least one passed', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: [false, undefined, true], // cantTell
          none: [true, false] // fail
        })
      );

      expect(checkResult.any).toHaveLength(0);
      expect(checkResult.none).toHaveLength(1);
    });

    it('includes cantTell checks from any if there are no fails', function () {
      const checkResult = axe.utils.aggregateChecks(
        createTestCheckResults({
          any: [undefined, undefined, false], // cantTell
          none: [undefined, false] // cantTell
        })
      );

      expect(checkResult.any).toHaveLength(2);
      expect(checkResult.none).toHaveLength(1);
    });
  });
});
