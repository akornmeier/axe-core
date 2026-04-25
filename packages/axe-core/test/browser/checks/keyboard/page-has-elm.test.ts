import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  checks,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('page-has-*', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = new createMockCheckContext();
  const shadowSupported = shadowSupport.v1;
  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = undefined;
  });

  describe('evaluate', () => {
    const evaluate = getCheckEvaluate('page-has-main');

    it('throws if there is no selector', () => {
      expect(function () {
        const params = checkSetup('<div id="target">No role</div>', undefined);
        checks['page-has-main'].evaluate.apply(checkContext, params as any);
      }).toThrow();

      expect(function () {
        const params = checkSetup('<div id="target">No role</div>', {});
        checks['page-has-main'].evaluate.apply(checkContext, params as any);
      }).toThrow();

      expect(function () {
        const badOptions = { selector: [] };
        const params = checkSetup('<div id="target">No role</div>', badOptions);
        checks['page-has-main'].evaluate.apply(checkContext, params as any);
      }).toThrow();
    });

    it('returns true if there are any matching elements', () => {
      const options = { selector: 'b' };
      const params = checkSetup(
        '<div id="target"><b>No role</b></div>',
        options
      );
      expect(evaluate.apply(checkContext, params as any)).toBe(true);
    });

    it('returns false if there are no matching elements', () => {
      const options = { selector: 'i' };
      const params = checkSetup(
        '<div id="target"><b>No role</b></div>',
        options
      );
      expect(evaluate.apply(checkContext, params as any)).toBe(false);
    });

    it('does not find hidden elements', () => {
      const options = { selector: 'b' };
      const params = checkSetup(
        '<div id="target"><b style="display: none;">No role</b></div>',
        options
      );
      expect(evaluate.apply(checkContext, params as any)).toBe(false);
    });

    it('does find screen-reader only elements', () => {
      const options = { selector: 'b' };
      const params = checkSetup(
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
    const after = checks['page-has-main'].after;

    it('sets all results to true if any are true', () => {
      const results = [
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
      const results = [
        { result: false },
        { result: false },
        { result: undefined }
      ];
      expect(after(results)).toBe(results);
    });
  });

  describe('page-has-main', () => {
    const check = checks['page-has-main'];

    it('should return false if no div has role property', () => {
      const params = checkSetup(
        '<div id="target">No role</div>',
        check.options
      );
      const mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(false);
    });

    it('should return false if div has role not equal to main', () => {
      const params = checkSetup(
        '<div id="target" role="bananas">Wrong role</div>',
        check.options
      );
      const mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(false);
    });

    it('should return true if main landmark exists', () => {
      const params = checkSetup(
        '<main id="target">main landmark</main>',
        check.options
      );
      const mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(true);
    });

    it('should return true if one div has role equal to main', () => {
      const params = checkSetup(
        '<div id="target" role="main">Div with role main</div>',
        check.options
      );
      const mainIsFound = check.evaluate.apply(checkContext, params as any);
      expect(mainIsFound).toBe(true);
    });

    (shadowSupported ? it : it.skip)(
      'should return true if main is inside of shadow dom',
      function () {
        const params = shadowCheckSetup(
          '<div id="target"></div>',
          '<main>main landmark</main>',
          check.options
        );
        const mainIsFound = check.evaluate.apply(checkContext, params as any);
        expect(mainIsFound).toBe(true);
      }
    );
  });

  describe('page-has-heading-one', () => {
    const check = checks['page-has-heading-one'];

    it('should return false if div has role not equal to heading', () => {
      const params = checkSetup(
        '<div id="target" role="bananas">Wrong role</div>',
        check.options
      );
      const h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(false);
    });

    it('should return false if div has role heading but not aria-level=1', () => {
      const params = checkSetup(
        '<div id="target" role="heading" aria-level="one">Wrong role</div>',
        check.options
      );
      const h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(false);
    });

    it('should return true if h1 exists', () => {
      const params = checkSetup(
        '<h1 id="target">My heading</h1>',
        check.options
      );
      const h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(true);
    });

    it('should return true if a div has role=heading and aria-level=1', () => {
      const params = checkSetup(
        '<div id="target" role="heading" aria-level="1">Diversity heading</div>',
        check.options
      );
      const h1IsFound = check.evaluate.apply(checkContext, params as any);
      expect(h1IsFound).toBe(true);
    });

    (shadowSupported ? it : it.skip)(
      'should return true if h1 is inside of shadow dom',
      function () {
        const params = shadowCheckSetup(
          '<div id="target"></div>',
          '<h1>Shady Heading</h1>',
          check.options
        );
        const h1IsFound = check.evaluate.apply(checkContext, params as any);
        expect(h1IsFound).toBe(true);
      }
    );
  });
});
