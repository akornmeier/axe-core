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
describe('utils.matchesSelector', function () {
  const matchesSelector = axe.utils.matchesSelector;

  function mockMethod(method, returnValue) {
    const result = {};
    result[method] = function () {
      return returnValue;
    };
    result.ownerDocument = {
      defaultView: {
        Element: {
          prototype: {}
        }
      }
    };
    result.ownerDocument.defaultView.Element.prototype[method] = function () {};

    return result;
  }

  it('should check the prototype of the Element object for matching methods', function () {
    expect(matchesSelector(mockMethod('matches', 'test1'))).toBe('test1');
    expect(matchesSelector(mockMethod('matchesSelector', 'test2'))).toBe(
      'test2'
    );
    expect(matchesSelector(mockMethod('mozMatchesSelector', 'test3'))).toBe(
      'test3'
    );
    expect(matchesSelector(mockMethod('webkitMatchesSelector', 'test4'))).toBe(
      'test4'
    );
    expect(matchesSelector(mockMethod('msMatchesSelector', 'test5'))).toBe(
      'test5'
    );
  });

  it('should actually work', function () {
    let target,
      fixture = document.getElementById('fixture');

    fixture.innerHTML = '<div id="test">Hi</div>';
    target = document.getElementById('test');
    expect(matchesSelector(target, '#test')).toBeTruthy();

    fixture.innerHTML = '';
  });

  it('should return false if the element does not have a matching method', function () {
    let target,
      fixture = document.getElementById('fixture');

    fixture.innerHTML = '<div id="test">Hi</div>';
    target = document.getElementById('test');

    target.matches = null;
    target.matchesSelector = null;
    target.mozMatchesSelector = null;
    target.webkitMatchesSelector = null;
    target.msMatchesSelector = null;

    expect(matchesSelector(target, '#test')).toBe(false);

    fixture.innerHTML = '';
  });
});
