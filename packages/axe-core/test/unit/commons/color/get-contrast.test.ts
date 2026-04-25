import { describe, expect, it } from 'vitest';
import Color from '../../../../lib/commons/color/color';
import getContrast from '../../../../lib/commons/color/get-contrast';

describe('getContrast', function () {
  it('should calculate contrast sensibly', function () {
    const black = new Color(0, 0, 0, 1);
    const transparent = new Color(0, 0, 0, 0);
    const white = new Color(255, 255, 255, 1);
    const yellow = new Color(255, 255, 0, 1);

    //Same foreground/background gives 1
    expect(getContrast(black, black)).toBe(1);
    expect(getContrast(transparent, black)).toBe(1);
    expect(getContrast(white, white)).toBe(1);
    expect(getContrast(yellow, yellow)).toBe(1);

    //contrast ratio is reversible
    expect(getContrast(yellow, black)).toBe(getContrast(black, yellow));
    expect(getContrast(yellow, white)).toBe(getContrast(white, yellow));

    //things that are more contrasty return higher values than things that are less contrasty
    expect(getContrast(yellow, white) < getContrast(yellow, black)).toBe(true);
    expect(getContrast(yellow, black) < getContrast(white, black)).toBe(true);
  });
});
