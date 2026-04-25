describe('CheckResult', function () {
  'use strict';

  const CheckResult = axe._thisWillBeDeletedDoNotUse.base.CheckResult;
  it('should be a function', function () {
    assert.isFunction(CheckResult);
  });

  it('should have an id', function () {
    const result = new CheckResult({ id: 'monkeys' });
    assert.equal(result.id, 'monkeys');
  });

  it('should set `data` to `null`', function () {
    const result = new CheckResult({});
    assert.isNull(result.data);
  });

  it('should set `relatedNodes` to `[]`', function () {
    const result = new CheckResult({});
    assert.deepEqual(result.relatedNodes, []);
  });

  it('should set `result` to `null`', function () {
    const result = new CheckResult({});
    assert.isNull(result.result);
  });
});
