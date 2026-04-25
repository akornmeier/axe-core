import { describe, expect, it } from 'vitest';
import sanitize from '../../../../lib/commons/text/sanitize';

describe('sanitize', function () {
  it('should collapse whitespace and trim', function () {
    expect(sanitize('\thi\t')).toBe('hi');
    expect(sanitize('\t\nhi \t')).toBe('hi');
    expect(sanitize('\thi \n\t ')).toBe('hi');
    expect(sanitize(' hi\r\nok')).toBe('hi\nok');
    expect(sanitize('hello\u00A0there')).toBe('hello there');
  });

  it('should accept null', function () {
    expect(sanitize(null)).toBe('');
  });
});
