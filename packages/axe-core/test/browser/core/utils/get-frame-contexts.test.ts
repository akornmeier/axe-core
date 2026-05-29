import { axe, shadowSupport } from '@helpers/check-helpers';
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
describe('utils.getFrameContexts', function () {
  var getFrameContexts = axe.utils.getFrameContexts;
  var shadowSupported = shadowSupport.v1;
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  it('returns an empty array if the page has no frames', function () {
    var frameContext = getFrameContexts();
    expect(Array.isArray(frameContext)).toBe(true);
    expect(frameContext).toHaveLength(0);
  });

  it('returns a `frameSelector` for each included frame', function () {
    fixture.innerHTML =
      '<iframe></iframe>' + '<iframe></iframe>' + '<iframe></iframe>';

    var selectors = getFrameContexts().map(function (frameData) {
      return frameData.frameSelector;
    });
    expect(selectors).toHaveLength(3);
    expect(selectors[0]).toContain('iframe:nth-child(1)');
    expect(selectors[1]).toContain('iframe:nth-child(2)');
    expect(selectors[2]).toContain('iframe:nth-child(3)');
  });

  it('sets frameContext.initiator to false for each included frame', function () {
    fixture.innerHTML =
      '<iframe></iframe>' + '<iframe></iframe>' + '<iframe></iframe>';

    var contexts = getFrameContexts().map(function (frameData) {
      return frameData.frameContext;
    });

    expect(contexts).toHaveLength(3);
    expect(contexts[0].initiator).toBe(false);
    expect(contexts[1].initiator).toBe(false);
    expect(contexts[2].initiator).toBe(false);
  });

  it('sets frameContext.focusable depending on the frame', function () {
    fixture.innerHTML =
      '<iframe></iframe>' +
      '<iframe tabindex="0"></iframe>' +
      '<iframe tabindex="-1"></iframe>';

    var contexts = getFrameContexts().map(function (frameData) {
      return frameData.frameContext;
    });
    expect(contexts).toHaveLength(3);
    expect(contexts[0].focusable).toBe(true);
    expect(contexts[1].focusable).toBe(true);
    expect(contexts[2].focusable).toBe(false);
  });

  it('sets frameContext.size based on frame size', function () {
    fixture.innerHTML =
      '<iframe width="1" height="1"></iframe>' +
      '<iframe width="10" height="10"></iframe>' +
      '<iframe width="100" height="100"></iframe>';

    var frameSize = getFrameContexts().map(function (frameData) {
      return frameData.frameContext.size;
    });
    expect(frameSize).toHaveLength(3);
    expect(frameSize[0]).toEqual({
      width: 1,
      height: 1
    });
    expect(frameSize[1]).toEqual({
      width: 10,
      height: 10
    });
    expect(frameSize[2]).toEqual({
      width: 100,
      height: 100
    });
  });

  describe('include / exclude', function () {
    it('returns a `frameContext` for each included frame', function () {
      fixture.innerHTML =
        '<iframe id="f1"></iframe>' +
        '<iframe id="f2"></iframe>' +
        '<iframe id="f3"></iframe>';
      var context = {
        include: [
          ['#f1', 'header'],
          ['#f2', 'main']
        ],
        exclude: [['#f3', 'footer']]
      };
      var contexts = getFrameContexts(context).map(function (frameData) {
        return frameData.frameContext;
      });

      expect(contexts).toHaveLength(3);
      expect(contexts[0].include).toEqual([['header']]);
      expect(contexts[0].exclude).toEqual([]);
      expect(contexts[1].include).toEqual([['main']]);
      expect(contexts[1].exclude).toEqual([]);
      expect(contexts[2].include).toEqual([]);
      expect(contexts[2].exclude).toEqual([['footer']]);
    });

    it('excludes non-frame contexts', function () {
      fixture.innerHTML = '<iframe id="f1"></iframe>';
      var context = {
        include: [['#header'], ['a'], ['#f1', 'header']]
      };
      var contexts = getFrameContexts(context).map(function (frameData) {
        return frameData.frameContext;
      });

      expect(contexts).toHaveLength(1);
      expect(contexts[0].include).toEqual([['header']]);
      expect(contexts[0].exclude).toEqual([]);
    });

    it('mixes contexts if the frame is selected twice', function () {
      fixture.innerHTML =
        '<iframe id="f1"></iframe>' + '<iframe id="f2"></iframe>';
      var context = {
        include: [
          ['#f1', 'header'],
          ['#f2', 'footer']
        ],
        exclude: [['iframe', 'main']]
      };
      var contexts = getFrameContexts(context).map(function (frameData) {
        return frameData.frameContext;
      });
      expect(contexts).toHaveLength(2);
      expect(contexts[0].include).toEqual([['header']]);
      expect(contexts[0].exclude).toEqual([['main']]);
      expect(contexts[1].include).toEqual([['footer']]);
      expect(contexts[1].exclude).toEqual([['main']]);
    });

    it('combines include/exclude arrays of frames selected twice', function () {
      fixture.innerHTML = '<iframe></iframe>';
      var context = {
        include: [
          ['iframe', 'header'],
          ['iframe', 'main']
        ],
        exclude: [
          ['iframe', 'aside'],
          ['iframe', 'footer']
        ]
      };
      var contexts = getFrameContexts(context).map(function (frameData) {
        return frameData.frameContext;
      });

      expect(contexts).toHaveLength(1);
      expect(contexts[0].include).toEqual([['header'], ['main']]);
      expect(contexts[0].exclude).toEqual([['aside'], ['footer']]);
    });

    it('skips excluded frames', function () {
      fixture.innerHTML =
        '<iframe id="f1"></iframe>' +
        '<iframe id="f2"></iframe>' +
        '<iframe id="f3"></iframe>';
      var context = {
        exclude: [[['#f2']]]
      };
      var selectors = getFrameContexts(context).map(function (frameData) {
        return frameData.frameSelector;
      });
      expect(selectors).toHaveLength(2);
      expect(selectors[0]).toContain('iframe:nth-child(1)');
      expect(selectors[1]).toContain('iframe:nth-child(3)');
    });

    it('skips frames excluded by a parent', function () {
      fixture.innerHTML = '<iframe></iframe>';
      var frameContexts = getFrameContexts({
        exclude: [['#fixture']]
      });
      expect(frameContexts).toHaveLength(0);
    });

    it('normalizes the context', function () {
      var frameContexts;
      fixture.innerHTML =
        '<iframe id="f1"></iframe>' + '<iframe id="f2"></iframe>';
      frameContexts = getFrameContexts('#f1');
      expect(frameContexts).toHaveLength(1);
      expect(frameContexts[0].frameSelector).toContain('iframe:nth-child(1)');
      expect(frameContexts[0].frameContext.include).toEqual([]);
      expect(frameContexts[0].frameContext.exclude).toEqual([]);

      frameContexts = getFrameContexts({ include: [['#f1']] });
      expect(frameContexts).toHaveLength(1);
      expect(frameContexts[0].frameSelector).toContain('iframe:nth-child(1)');
      expect(frameContexts[0].frameContext.include).toEqual([]);
      expect(frameContexts[0].frameContext.exclude).toEqual([]);

      frameContexts = getFrameContexts({ exclude: [['#f2']] });
      expect(frameContexts).toHaveLength(1);
      expect(frameContexts[0].frameSelector).toContain('iframe:nth-child(1)');
      expect(frameContexts[0].frameContext.include).toEqual([]);
      expect(frameContexts[0].frameContext.exclude).toEqual([]);
    });

    it('accepts elements', function () {
      var frameContexts;
      fixture.innerHTML =
        '<iframe id="f1"></iframe>' + '<iframe id="f2"></iframe>';
      var f1 = fixture.querySelector('#f1');
      var f2 = fixture.querySelector('#f2');
      frameContexts = getFrameContexts(f1);
      expect(frameContexts).toHaveLength(1);
      expect(frameContexts[0].frameSelector).toContain('iframe:nth-child(1)');
      expect(frameContexts[0].frameContext.include).toEqual([]);
      expect(frameContexts[0].frameContext.exclude).toEqual([]);

      frameContexts = getFrameContexts({ include: [f1] });
      expect(frameContexts).toHaveLength(1);
      expect(frameContexts[0].frameSelector).toContain('iframe:nth-child(1)');
      expect(frameContexts[0].frameContext.include).toEqual([]);
      expect(frameContexts[0].frameContext.exclude).toEqual([]);

      frameContexts = getFrameContexts({ exclude: [f2] });
      expect(frameContexts).toHaveLength(1);
      expect(frameContexts[0].frameSelector).toContain('iframe:nth-child(1)');
      expect(frameContexts[0].frameContext.include).toEqual([]);
      expect(frameContexts[0].frameContext.exclude).toEqual([]);
    });

    it('works with nested frames', function () {
      fixture.innerHTML =
        '<iframe id="f1"></iframe>' + '<iframe id="f2"></iframe>';
      var context = {
        include: [
          ['#f1', '#f3', 'header'],
          ['#f2', '#f4', '#f5', 'footer']
        ],
        exclude: [['#f2', '#f6', '#f7', '#f7', 'main']]
      };
      var contexts = getFrameContexts(context).map(function (frameData) {
        return frameData.frameContext;
      });

      expect(contexts).toHaveLength(2);
      expect(contexts[0].include).toEqual([['#f3', 'header']]);
      expect(contexts[0].exclude).toEqual([]);
      expect(contexts[1].include).toEqual([['#f4', '#f5', 'footer']]);
      expect(contexts[1].exclude).toEqual([['#f6', '#f7', '#f7', 'main']]);
    });

    (shadowSupported ? it : xit)('works on iframes in shadow dom', function () {
      fixture.innerHTML = '<div id="shadow"></div>';
      var div = fixture.querySelector('div');
      var shadowRoot = div.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML =
        '<main><iframe id="f1" width="100" height="100"></iframe></main>';

      var frameContext = getFrameContexts();

      expect(frameContext).toHaveLength(1);
      expect(frameContext[0].frameSelector).toHaveLength(2);
      expect(frameContext[0].frameSelector[1]).toBe('main > iframe');
      expect(frameContext[0].frameContext.include).toEqual([]);
      expect(frameContext[0].frameContext.exclude).toEqual([]);
    });
  });

  describe('options.iframes', function () {
    it('returns a non-empty array with `iframes: true`', function () {
      fixture.innerHTML = '<iframe></iframe>';
      var contexts = getFrameContexts({}, { iframes: true });
      expect(contexts).toHaveLength(1);
    });

    it('returns an empty array with `iframes: false`', function () {
      fixture.innerHTML = '<iframe></iframe>';
      var contexts = getFrameContexts({}, { iframes: false });
      expect(contexts).toHaveLength(0);
    });
  });
});
