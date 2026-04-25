import { axe } from '@helpers/check-helpers';
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
describe('axe.utils.isXHTML', function () {
  it('should be a function', function () {
    expect(typeof axe.utils.isXHTML).toBe('function');
  });

  it('should return true on any document that is XHTML', function () {
    const doc = document.implementation.createDocument(
      'http://www.w3.org/1999/xhtml',
      'html',
      null
    );
    expect(axe.utils.isXHTML(doc)).toBe(true);
  });

  it('should return false on any document that is HTML', function () {
    const doc = document.implementation.createHTMLDocument('Monkeys');
    expect(axe.utils.isXHTML(doc)).toBe(false);
  });

  it('should return false on any document that is HTML - fixture', function () {
    expect(axe.utils.isXHTML(document)).toBe(false);
  });
});
