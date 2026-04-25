import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('p-as-heading', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
  const shadowSupported = shadowSupport.v1;
  var testOptions = {
    margins: [{ weight: 100 }, { italic: true }, { size: 1.2 }]
  };

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = undefined;
  });

  it('returns true if the styles are identical', () => {
    var params = checkSetup(
      '<p id="target">elm 1</p> <p>elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('returns true if there is no p element following it', () => {
    var params = checkSetup('<p id="target">lone elm</p>', testOptions);
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('returns false if the font-weight is heavier', () => {
    var params = checkSetup(
      '<p id="target" style="font-weight:bold">elm 1</p>' + '<p>elm 2elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('returns false if the font-size is bigger', () => {
    var params = checkSetup(
      '<p id="target" style="font-size:150%">elm 1</p> <p>elm 2elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('returns false if the fake heading is italic and the text is not', () => {
    var params = checkSetup(
      '<p id="target" style="font-style:italic">elm 1</p> <p>elm 2elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('returns true if both texts are bold, italic and larger', () => {
    var params = checkSetup(
      '<p id="target" style="font-weight:bold; font-size:120%; font-style:italic">elm 1</p>' +
        '<p style="font: italic bold 120% bold">elm 2elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('considers styles of elements inside the paragraph', () => {
    var params = checkSetup(
      '<p id="target"><b>elm 1</b></p> <p>elm 2elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('ignores empty child element for style', () => {
    var params = checkSetup(
      '<p id="target"><span> </span><b>elm 1</b></p> <p>elm 2elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('considers styles of elements that do not contain all the text', () => {
    var params = checkSetup(
      '<p id="target"><b>elm</b> 1</p> <p>elm 2elm 2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('returns undefined instead of false if the element is inside a blockquote', () => {
    var params = checkSetup(
      '<blockquote>' +
        '<p style="font-weight:bold" id="target">elm 1</p> <p>elm 2elm 2</p>' +
        '</blockquote>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBeUndefined();
  });

  it('returns true over undefined from within a blockquote', () => {
    var params = checkSetup(
      '<blockquote>' +
        '<p id="target">elm 1</p> <p>elm 2elm 2</p>' +
        '</blockquote>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('returns undefined if a previous sibling has a similar font-weight', () => {
    var params = checkSetup(
      '<p><b>elm 1</b></p>' +
        '<p id="target"><b>elm 2</b></p>' +
        '<p>elm 3</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBeUndefined();
  });

  it('returns true if the heading is greater than the paragraph', () => {
    var params = checkSetup(
      '<p id="target">elm1elm1</p>' + '<p>elm2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('returns undefined if the heading is twice as long but not greater than the length of the pararaph', () => {
    var params = checkSetup(
      '<p id="target" style="font-weight:bold">elm1elm</p>' + '<p>elm2elm2</p>',
      testOptions
    );
    expect(
      getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
    ).toBeUndefined();
  });

  describe('options.passLength and options.failLength', () => {
    it('returns true if the heading is greater than the paragraph using options.passLength', () => {
      var options = {
        margins: [{ weight: 100 }, { italic: true }, { size: 1.2 }],
        passLength: 2
      };

      var params = checkSetup(
        '<p id="target">elm1elm1elm1</p>' + '<p>elm2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(true);
    });

    it('returns undefined if the heading is twice as long but not greater than the length of the pararaph using options.failLength ', () => {
      var options = {
        margins: [{ weight: 100 }, { italic: true }, { size: 1.2 }],
        failLength: 0.6
      };
      var params = checkSetup(
        '<p id="target" style="font-weight:bold">elm1elm</p>' +
          '<p>elm2elm2elm2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(false);
    });
  });

  describe('option.margin', () => {
    it('passes if no margins are set', () => {
      var options = {};

      var params = checkSetup(
        '<p id="target"><b>elm 1</b></p> <p>elm 2elm 2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(true);
    });

    it('takes an array of margins', () => {
      var options = {
        margins: [{ size: 1.2 }]
      };

      var params = checkSetup(
        '<p id="target"><b>elm 1</b></p> <p>elm 2elm 2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(true);
    });

    it('returns false if all values in the margin are passed', () => {
      var options = {
        margins: [{ size: 1.2, weight: 100 }]
      };

      var params = checkSetup(
        '<p id="target" style="font-size:1.5em; font-weight:bold">elm 1</p>' +
          '<p>elm 2elm 2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(false);
    });

    it('returns true if any of the values is not passed', () => {
      var options = {
        margins: [{ size: 1.2, weight: 100 }]
      };

      var params = checkSetup(
        '<p id="target" style="font-weight:bold">elm 1</p>' + '<p>elm 2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(true);
    });

    it('returns false if any of the margins is passed', () => {
      var options = {
        margins: [{ size: 1.2, weight: 100 }, { size: 1.5 }, { italic: true }]
      };

      var params = checkSetup(
        '<p id="target" style="font-style:italic">elm 1</p>' +
          '<p>elm 2elm 2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(false);
    });

    it('returns true if none of the set margins is passed', () => {
      /*eslint indent: 0*/
      var options = {
        margins: [
          { size: 1.2, weight: 100 },
          { size: 1.5 },
          { size: 1.2, italic: true }
        ]
      };

      var params = checkSetup(
        '<p id="target" style="font-size:1.5em">elm 1</p>' + '<p>elm 2</p>',
        options
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(true);
    });
  });

  (shadowSupported ? it : it.skip)(
    'returns undefined instead of false if the element is inside a blockquote in light dom',
    function () {
      var params = shadowCheckSetup(
        '<blockquote></blockquote>',
        '<p style="font-weight:bold" id="target">elm 1</p> <p>elm 2</p>',
        testOptions
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBeUndefined();
    }
  );

  (shadowSupported ? it : it.skip)(
    'returns true over undefined from within a blockquote in light dom',
    function () {
      var params = shadowCheckSetup(
        '<blockquote></blockquote>',
        '<p id="target">elm 1</p> <p>elm 2</p>',
        testOptions
      );
      expect(
        getCheckEvaluate('p-as-heading').apply(checkContext, params as any)
      ).toBe(true);
    }
  );
});
