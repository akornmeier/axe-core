import {
  checkSetup,
  shadowSupport,
  checks
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('caption', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return undefined if there is no track element', () => {
    var checkArgs = checkSetup('<audio></audio>', 'audio');
    expect(checks.caption.evaluate.apply(null, checkArgs)).toBeUndefined();
  });

  it('should return undefined if there is no kind=captions attribute', () => {
    var checkArgs = checkSetup(
      '<audio><track kind=descriptions></audio>',
      'audio'
    );
    expect(checks.caption.evaluate.apply(null, checkArgs)).toBeUndefined();
  });

  it('should pass if there is a kind=captions attribute', () => {
    var checkArgs = checkSetup('<audio><track kind=captions></audio>', 'audio');
    expect(checks.caption.evaluate.apply(null, checkArgs)).toBe(false);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should get track from composed tree',
    function () {
      var node = document.createElement('div');
      node.innerHTML = '<track kind=captions>';
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<audio><slot></slot></audio>';

      var checkArgs = checkSetup(node, {}, 'audio');
      expect(checks.caption.evaluate.apply(null, checkArgs)).toBe(false);
    }
  );
});
