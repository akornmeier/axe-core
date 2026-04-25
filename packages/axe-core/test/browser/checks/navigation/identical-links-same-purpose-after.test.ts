import { checks } from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('identical-links-same-purpose-after tests', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var check = checks['identical-links-same-purpose'];

  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('returns results by clearing relatedNodes after ignoring nodes which has no data (or result is undefined)', () => {
    var nodeOneData = {
      data: null,
      relatedNodes: ['nodeOne'],
      result: undefined
    };
    var nodeTwoData = {
      data: {
        name: 'read more',
        urlProps: { hostname: 'abc.com' }
      },
      relatedNodes: ['nodeTwo'],
      result: true
    };
    var checkResults = [nodeOneData, nodeTwoData];

    var results = check.after(checkResults);
    expect(results).toHaveLength(1);

    var result = results[0];
    expect(result.data).toEqual(nodeTwoData.data);
    expect(result.relatedNodes).toEqual([]);
    expect(result.result).toBe(true);
  });

  it('sets results of check result to `undefined` one of the native links do not have `urlProps` (and therefore removed as relatedNode)', () => {
    var nodeOneData = {
      data: {
        name: 'read more',
        urlProps: undefined
      },
      relatedNodes: ['nodeOne'],
      result: true
    };
    var nodeTwoData = {
      data: {
        name: 'read more',
        urlProps: { hostname: 'abc.com' }
      },
      relatedNodes: ['nodeTwo'],
      result: true
    };
    var checkResults = [nodeOneData, nodeTwoData];

    var results = check.after(checkResults);
    expect(results).toHaveLength(1);

    var result = results[0];
    expect(result.data).toEqual(nodeOneData.data);
    expect(result.relatedNodes).toEqual(['nodeTwo']);
    expect(result.result).toBe(undefined);
  });

  it('sets results of check result to `undefined` if native links do not have same `urlProps` (values are different)', () => {
    var nodeOneData = {
      data: {
        name: 'follow us',
        urlProps: { hostname: 'facebook.com' }
      },
      relatedNodes: ['nodeOne'],
      result: true
    };
    var nodeTwoData = {
      data: {
        name: 'follow us',
        urlProps: { hostname: 'instagram.com' }
      },
      relatedNodes: ['nodeTwo'],
      result: true
    };
    var checkResults = [nodeOneData, nodeTwoData];

    var results = check.after(checkResults);
    expect(results).toHaveLength(1);

    var result = results[0];
    expect(result.data).toEqual(nodeOneData.data);
    expect(result.relatedNodes).toEqual(['nodeTwo']);
    expect(result.result).toBe(undefined);
  });

  it('sets results of check result to `undefined` if native links do not have same `urlProps` (keys are different)', () => {
    var nodeOneData = {
      data: {
        name: 'follow us',
        urlProps: { abc: 'abc.com' }
      },
      relatedNodes: ['nodeOne'],
      result: true
    };
    var nodeTwoData = {
      data: {
        name: 'follow us',
        urlProps: { xyz: 'abc.com' }
      },
      relatedNodes: ['nodeTwo'],
      result: true
    };
    var checkResults = [nodeOneData, nodeTwoData];

    var results = check.after(checkResults);
    expect(results).toHaveLength(1);

    var result = results[0];
    expect(result.data).toEqual(nodeOneData.data);
    expect(result.relatedNodes).toEqual(['nodeTwo']);
    expect(result.result).toBe(undefined);
  });

  it('sets results of check result to `true` if native links serve identical purpose', () => {
    var nodeOneData = {
      data: {
        name: 'Axe Core',
        urlProps: { hostname: 'deque.com', pathname: 'axe-core' }
      },
      relatedNodes: ['nodeOne'],
      result: true
    };
    var nodeTwoData = {
      data: {
        name: 'Axe Core',
        urlProps: { hostname: 'deque.com', pathname: 'axe-core' }
      },
      relatedNodes: ['nodeTwo'],
      result: true
    };
    var checkResults = [nodeOneData, nodeTwoData];

    var results = check.after(checkResults);

    expect(results).toHaveLength(1);

    var result = results[0];
    expect(result.data).toEqual(nodeOneData.data);
    expect(result.relatedNodes).toEqual(['nodeTwo']);
    expect(result.result).toBe(true);
  });

  it('sets results of check result to `true` if ARIA links have different accessible names', () => {
    var nodeOneData = {
      data: {
        name: 'earth',
        urlProps: {}
      },
      relatedNodes: ['nodeOne'],
      result: true
    };

    var nodeTwoData = {
      data: {
        name: 'venus',
        urlProps: {}
      },
      relatedNodes: ['nodeTwo'],
      result: true
    };
    var checkResults = [nodeOneData, nodeTwoData];
    var results = check.after(checkResults);
    expect(results).toHaveLength(2);

    expect(results[0].data).toEqual(nodeOneData.data);
    expect(results[0].relatedNodes).toEqual([]);
    expect(results[0].result).toBe(true);

    expect(results[1].data).toEqual(nodeTwoData.data);
    expect(results[1].relatedNodes).toEqual([]);
    expect(results[1].result).toBe(true);
  });
});
