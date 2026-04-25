import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import getFriendlyUriEnd from '../../../../lib/core/utils/get-friendly-uri-end';

describe('getFriendlyUriEnd', function () {
  it('returns a domain name', function () {
    expect('deque.com').toBe(getFriendlyUriEnd('http://deque.com'));
    expect('deque.com/').toBe(getFriendlyUriEnd('https://www.deque.com/'));
    expect('docs.deque.com/').toBe(getFriendlyUriEnd('//docs.deque.com/'));
  });

  it('returns a filename', function () {
    expect('contact/').toBe(getFriendlyUriEnd('../../contact/'));
    expect('contact/').toBe(getFriendlyUriEnd('http://deque.com/contact/'));
    expect('contact').toBe(getFriendlyUriEnd('/contact'));
    expect('contact.html').toBe(getFriendlyUriEnd('/contact.html'));
  });

  it('trims whitespace', function () {
    expect(undefined).toBe(getFriendlyUriEnd('  '));
    expect('start page').toBe(getFriendlyUriEnd('start page\t'));
    expect('home#heading').toBe(getFriendlyUriEnd('home#heading  '));
  });

  it('returns a hash URI', function () {
    expect('#footer').toBe(getFriendlyUriEnd('#footer'));
    expect('contact.html#footer').toBe(
      getFriendlyUriEnd('/contact.html#footer')
    );
    expect('home.html#main').toBe(getFriendlyUriEnd('/home.html#main '));
  });

  it('returns undef when there is a query', function () {
    expect(getFriendlyUriEnd('/contact?')).toBeUndefined();
    expect(getFriendlyUriEnd('/contact?foo=bar')).toBeUndefined();
  });

  it('returns undef for index files', function () {
    expect(getFriendlyUriEnd('/index.cfs')).toBeUndefined();
    expect(getFriendlyUriEnd('/index')).toBeUndefined();
  });

  it('returns undef when the result is too short', function () {
    expect(getFriendlyUriEnd('/i.html')).toBeUndefined();
    expect(getFriendlyUriEnd('/dq')).toBeUndefined();
  });

  it('returns undef when the result is too long', function () {
    expect(getFriendlyUriEnd('/abcd.html', { maxLength: 50 })).toBeDefined();
    expect(getFriendlyUriEnd('#foo-bar-baz', { maxLength: 50 })).toBeDefined();
    expect(getFriendlyUriEnd('//deque.com', { maxLength: 50 })).toBeDefined();

    expect(getFriendlyUriEnd('/abcd.html', { maxLength: 5 })).toBeUndefined();
    expect(getFriendlyUriEnd('#foo-bar-baz', { maxLength: 5 })).toBeUndefined();
    expect(getFriendlyUriEnd('//deque.com', { maxLength: 5 })).toBeUndefined();
  });

  it('returns undef when the result has too many numbers', function () {
    expect(getFriendlyUriEnd('123456.html')).toBeUndefined();
  });
});
