import { describe, expect, it } from 'vitest';
import Color from '../../../../lib/commons/color/color';
import hasValidContrastRatio from '../../../../lib/commons/color/has-valid-contrast-ratio';

describe('Color', function () {
  it('should give sensible results for WCAG compliance', function () {
    var black = new Color(0, 0, 0, 1);
    var white = new Color(255, 255, 255, 1);
    var gray = new Color(128, 128, 128, 1);

    expect(hasValidContrastRatio(black, white, 8, false).isValid).toBe(true);
    expect(
      hasValidContrastRatio(black, white, 8, false).contrastRatio > 4.5
    ).toBe(true);
    expect(
      hasValidContrastRatio(black, white, 8, false).expectedContrastRatio ===
        4.5
    ).toBe(true);

    expect(hasValidContrastRatio(white, gray, 24, false).isValid).toBe(true);
    expect(
      hasValidContrastRatio(white, gray, 24, false).contrastRatio > 3
    ).toBe(true);
    expect(
      hasValidContrastRatio(white, gray, 24, false).expectedContrastRatio === 3
    ).toBe(true);

    expect(hasValidContrastRatio(white, gray, 20, true).isValid).toBe(true);
    expect(hasValidContrastRatio(white, gray, 20, true).contrastRatio > 3).toBe(
      true
    );
    expect(
      hasValidContrastRatio(white, gray, 20, true).expectedContrastRatio === 3
    ).toBe(true);

    expect(hasValidContrastRatio(white, gray, 8, false).isValid).toBe(false);
    expect(
      hasValidContrastRatio(white, gray, 8, false).contrastRatio < 4.5
    ).toBe(true);
    expect(
      hasValidContrastRatio(white, gray, 8, false).expectedContrastRatio === 4.5
    ).toBe(true);
  });

  it('should count 1-1 ratios as visually hidden', function () {
    var black = new Color(0, 0, 0, 1);

    expect(hasValidContrastRatio(black, black, 16, true).isValid).toBe(false);
    expect(
      hasValidContrastRatio(black, black, 16, true).contrastRatio === 1
    ).toBe(true);
    expect(
      hasValidContrastRatio(black, black, 16, true).expectedContrastRatio ===
        4.5
    ).toBe(true);
  });
});
