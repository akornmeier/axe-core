import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('meta-refresh', () => {
  var checkContext = createMockCheckContext();
  var metaRefreshCheck = getCheckEvaluate('meta-refresh');

  afterEach(() => {
    checkContext.reset();
  });

  it('returns false if there is a number', () => {
    var checkArgs = checkSetup('<meta id="target" name="refresh" content="3">');
    expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
  });

  describe('returns false when valid', () => {
    it('there is a decimal', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3.1">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });

    it('there is a number followed by a dot', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3.">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });

    it('there is a dot followed by a number', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content=".5">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });

    it('there is whitespace before the number', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="  \n\t3">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });

    describe('with a valid separator', () => {
      it('the number is followed by a semicolon', () => {
        var checkArgs = checkSetup(
          '<meta id="target" name="refresh" content="3;">'
        );
        expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
      });

      it('the number is followed by a comma', () => {
        var checkArgs = checkSetup(
          '<meta id="target" name="refresh" content="3,">'
        );
        expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
      });

      it('the number is followed spaces, and then a separator', () => {
        var checkArgs = checkSetup(
          '<meta id="target" name="refresh" content="3 \t\n;">'
        );
        expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
      });

      it('the separator is followed by non-separator characters', () => {
        var checkArgs = checkSetup(
          '<meta id="target" name="refresh" content="3; https://deque.com/">'
        );
        expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
      });

      it('the separator is a space', () => {
        var checkArgs = checkSetup(
          '<meta id="target" name="refresh" content="3 https://deque.com/">'
        );
        expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
      });
    });
  });

  describe('returns true when invalid', () => {
    it('the number is prefaced with a plus', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="+3">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(true);
    });

    it('the number is prefaced with a minus', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="-3">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(true);
    });

    it('the number is prefaced with a letter', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="a3">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(true);
    });

    it('the number is followed by an invalid separator character', () => {
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3: https://deque.com/">'
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(true);
    });
  });

  describe('options.minDelay', () => {
    it('returns false when the redirect number is greater than minDelay', () => {
      var options = { minDelay: 2 };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });

    it('returns true when the redirect number equals minDelay', () => {
      var options = { minDelay: 3 };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(true);
    });

    it('returns true when the redirect number is less than minDelay', () => {
      var options = { minDelay: 4 };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(true);
    });

    it('ignores minDelay when set to false', () => {
      var options = { minDelay: false };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="0">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });
  });

  describe('options.maxDelay', () => {
    it('returns true when the redirect number is greater than maxDelay', () => {
      var options = { maxDelay: 2 };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(true);
    });

    it('returns false when the redirect number equals maxDelay', () => {
      var options = { maxDelay: 3 };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });

    it('returns false when the redirect number is less than maxDelay', () => {
      var options = { maxDelay: 4 };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="3">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });

    it('ignores maxDelay when set to false', () => {
      var options = { maxDelay: false };
      var checkArgs = checkSetup(
        '<meta id="target" name="refresh" content="9999">',
        options
      );
      expect(metaRefreshCheck.apply(checkContext, checkArgs)).toBe(false);
    });
  });
});
