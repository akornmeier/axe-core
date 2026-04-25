import { createMockCheckContext, checks } from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('region-after', () => {
  const checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
  });

  it('should always pass iframes', () => {
    const results = checks.region.after([
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe']
        },
        result: false
      },
      {
        data: { isIframe: false },
        node: {
          ancestry: ['html > body > iframe', 'html > body > p']
        },
        result: false
      }
    ]);
    expect(results[0].result).toBe(true);
    expect(results[1].result).toBe(false);
  });

  it('should pass children of iframes if the iframe contained in it is in a region', () => {
    const results = checks.region.after([
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe']
        },
        result: true
      },
      {
        data: { isIframe: false },
        node: {
          ancestry: ['html > body > iframe', 'html > body > p']
        },
        result: false
      }
    ]);

    expect(results[0].result).toBe(true);
    expect(results[1].result).toBe(true);
  });

  it('should pass nested iframes', () => {
    const results = checks.region.after([
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe']
        },
        result: false
      },
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe', 'html > body > iframe']
        },
        result: false
      },
      {
        data: { isIframe: false },
        node: {
          ancestry: [
            'html > body > iframe',
            'html > body > iframe',
            'html > body > p'
          ]
        },
        result: false
      }
    ]);

    expect(results[0].result).toBe(true);
    expect(results[1].result).toBe(true);
    expect(results[2].result).toBe(false);
  });

  it('should pass children of nested iframes if the nested iframe is in a region', () => {
    const results = checks.region.after([
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe']
        },
        result: false
      },
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe', 'html > body > iframe']
        },
        result: true
      },
      {
        data: { isIframe: false },
        node: {
          ancestry: [
            'html > body > iframe',
            'html > body > iframe',
            'html > body > p'
          ]
        },
        result: false
      }
    ]);

    expect(results[0].result).toBe(true);
    expect(results[1].result).toBe(true);
    expect(results[2].result).toBe(true);
  });

  it('should pass content if a grandparent frame passes', () => {
    const results = checks.region.after([
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe']
        },
        result: true
      },
      {
        data: { isIframe: true },
        node: {
          ancestry: ['html > body > iframe', 'html > body > iframe']
        },
        result: false
      },
      {
        data: { isIframe: false },
        node: {
          ancestry: [
            'html > body > iframe',
            'html > body > iframe',
            'html > body > p'
          ]
        },
        result: false
      }
    ]);
    expect(results[0].result).toBe(true);
    expect(results[1].result).toBe(true);
    expect(results[2].result).toBe(true);
  });
});
