import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  checks,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('page-has-*', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = new createMockCheckContext();
  const shadowSupported = shadowSupport.v1;
  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = undefined;
  });

  describe('evaluate', () => {
    var evaluate = getCheckEvaluate('page-has-main');

    it('throws if there is no selector', () => {
      expect(function () {
        var params = checkSetup('<div id="target">No role</div>', undefined);
        checks['page-has-main'].evaluate.apply(checkContext, params as any);
      }).toThrow();

      expect(function () {
        var params = checkSetup('<div id="target">No role</div>', {});
        checks['page-has-main'].evaluate.apply(checkContext, params as any);
      }).toThrow();

      expect(function () {
        var badOptions = { selector: [] };
        var params = checkSetup('<div id="target">No role</div>', badOptions);
        checks['page-has-main'].evaluate.apply(checkContext, params as any);
      }).toThrow();
    });

    it('returns true if there are any matching elements', () => {
      var options = { selector: 'b' };
      var params = checkSetup('<div id="target"><b>No role</b></div>', options);
      expect(evaluate.apply(checkContext, params as any)).toBe(true);
    });

    it('returns false if there are no matching elements', () => {
      var options = { selector: 'i' };
      var params = checkSetup('<div id="target"><b>No role</b></div>', options);
      expect(evaluate.apply(checkContext, params as any)).toBe(false);
    });

    it('does not find hidden elements', () => {
      var options = { selector: 'b' };
      var params = checkSetup(
        '<div id="target"><b style="display: none;">No role</b></div>',
        options
      );
      expect(evaluate.apply(checkContext, params as any)).toBe(false);
    });

    it('does find screen-reader only elements', () => {
      var options = { selector: 'b' };
      var params = checkSetup(
        '<style type="text/css">' +
          '.sr-only {' +
          'border: 0;' +
          'clip: rect(0 0 0 0);' +
          'clip-path: polygon(0px 0px, 0px 0px, 0px 0px);' +
          '-webkit-clip-path: polygon(0px 0px, 0px 0px, 0px 0px);' +
          'height: 1px;' +
          'margin: -1px;' +
          'overflow: hidden;' +
          'padding: 0;' +
          'position: absolute;' +
          'width: 1px;' +
          'white-space: nowrap;' +
          '}' +
          '</style>' +
          '<div id="target"><b class="sr-only">No role</b></div>',
        options
      );
      expect(evaluate.apply(checkContext, params as any)).toBe(true);
    });
  });

  describe('after', () => {
    var after = checks['page-has-main'].after;

    it('sets all results to true if any are true', () => {
      var results = [
        { result: true },
        { result: false },
        { result: undefined }
      ];
      expect(after(results)).toEqual([
        { result: true },
        { result: true },
        { result: true }
      ]);
    });

    it('Leave the results as is if none of them were true', () => {
      var results = [
        { result: false },
        { result: false },
        { result: undefined }
      ];
      expect(after(results)).toBe(results);
    });
  });

  describe('page-has-main', () => {
    var check = checks['page-has-main'];

    it('should return false if no div has role property', () => {
      var params = checkSetup('<div id="target">No role</div>', check.options);
      var mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(false);
    });

    it('should return false if div has role not equal to main', () => {
      var params = checkSetup(
        '<div id="target" role="bananas">Wrong role</div>',
        check.options
      );
      var mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(false);
    });

    it('should return true if main landmark exists', () => {
      var params = checkSetup(
        '<main id="target">main landmark</main>',
        check.options
      );
      var mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(true);
    });

    it('should return true if one div has role equal to main', () => {
      var params = checkSetup(
        '<div id="target" role="main">Div with role main</div>',
        check.options
      );
      var mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(true);
    });

    (shadowSupported ? it : it.skip)(
      'should return true if main is inside of shadow dom',
      function () {
        var params = shadowCheckSetup(
          '<div id="target"></div>',
          '<main>main landmark</main>',
          check.options
        );
        var mainIsFound = check.evaluate.apply(checkContext, params as any);
        expect(mainIsFound).toBe(true);
      }
    );
  });

  describe('page-has-heading-one', () => {
    var check = checks['page-has-heading-one'];

    it('should return false if div has role not equal to heading', () => {
      var params = checkSetup(
        '<div id="target" role="bananas">Wrong role</div>',
        check.options
      );
      var h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(false);
    });

    it('should return false if div has role heading but not aria-level=1', () => {
      var params = checkSetup(
        '<div id="target" role="heading" aria-level="one">Wrong role</div>',
        check.options
      );
      var h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(false);
    });

    it('should return true if h1 exists', () => {
      var params = checkSetup('<h1 id="target">My heading</h1>', check.options);
      var h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(true);
    });

    it('should return true if a div has role=heading and aria-level=1', () => {
      var params = checkSetup(
        '<div id="target" role="heading" aria-level="1">Diversity heading</div>',
        check.options
      );
      var h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(true);
    });

    (shadowSupported ? it : it.skip)(
      'should return true if h1 is inside of shadow dom',
      function () {
        var params = shadowCheckSetup(
          '<div id="target"></div>',
          '<h1>Shady Heading</h1>',
          check.options
        );
        var h1IsFound = check.evaluate.apply(checkContext, params as any);
        expect(h1IsFound).toBe(true);
      }
    );
  });
});
