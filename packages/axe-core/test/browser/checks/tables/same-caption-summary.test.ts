import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import sameCaptionSummaryEvaluate from '@checks/tables/same-caption-summary-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const sameCaptionSummaryEvaluateESM = getCheckEvaluateESM(
  sameCaptionSummaryEvaluate
);
describe('same-caption-summary', () => {
  const checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
    axe._tree = undefined;
  });

  it('should return false there is no caption', () => {
    const params = checkSetup(
      '<table summary="hi" id="target"><tr><td></td></tr></table>'
    );

    expect(
      sameCaptionSummaryEvaluateESM.apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should return false there is no summary', () => {
    const params = checkSetup(
      '<table id="target"><caption>Hi</caption><tr><td></td></tr></table>'
    );

    expect(
      sameCaptionSummaryEvaluateESM.apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should return false if summary and caption are different', () => {
    const params = checkSetup(
      '<table summary="bye" id="target"><caption>Hi</caption><tr><td></td></tr></table>'
    );

    expect(
      sameCaptionSummaryEvaluateESM.apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should return true if summary and caption are the same', () => {
    const params = checkSetup(
      '<table summary="Hi" id="target"><caption>Hi</caption><tr><td></td></tr></table>'
    );

    expect(
      sameCaptionSummaryEvaluateESM.apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should return true if summary and caption are the same with mixed casing', () => {
    const params = checkSetup(
      '<table summary="My Table" id="target">' +
        '<caption> my table </caption>' +
        '<thead>' +
        '<tr><th scope="col">Head</th></tr>' +
        '</thead>' +
        '<tbody>' +
        '<tr><td>Data</td></tr>' +
        '</tbody>' +
        '</table>'
    );

    expect(
      sameCaptionSummaryEvaluateESM.apply(checkContext, params as any)
    ).toBe(true);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should match slotted caption elements',
    function () {
      const params = shadowCheckSetup(
        '<div>' +
          '<span slot="caption">Caption</span>' +
          '<span slot="one">Data element 1</span>' +
          '<span slot="two">Data element 2</span>' +
          '</div>',
        '<table summary="Caption" id="target">' +
          '<caption><slot name="caption"></slot></caption>' +
          '<tr><td><slot name="one"></slot></td><td><slot name="two"></slot></td></tr>' +
          '</table>'
      );

      expect(
        sameCaptionSummaryEvaluateESM.apply(checkContext, params as any)
      ).toBe(true);
    }
  );
});
