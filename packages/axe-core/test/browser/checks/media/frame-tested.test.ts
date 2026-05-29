import { getCheckEvaluateESM } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import frameTestedEvaluate from '@checks/media/frame-tested-evaluate';
import { describe, it, expect } from 'vitest';

const frameTestedEvaluateESM = getCheckEvaluateESM(frameTestedEvaluate, {
  isViolation: false
});
const audit = createSyntheticAudit(['frame-tested']);

describe('frame-tested', () => {
  const checkEvaluate = frameTestedEvaluateESM;
  const frameTestedAfter = audit.checks['frame-tested'].after;

  describe('evaluate', () => {
    it('returns undefined', () => {
      expect(checkEvaluate()).toBeUndefined();
    });

    it('returns false if passed isViolation:true', () => {
      expect(checkEvaluate(null, { isViolation: true })).toBe(false);
    });
  });

  describe('after', () => {
    it('changes result to true if frame has been tested', () => {
      const results = [
        {
          result: undefined,
          node: {
            ancestry: ['html']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#1']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#2']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#1', 'html']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#2', 'html']
          }
        }
      ];

      const afterResults = frameTestedAfter(results);
      expect(afterResults).toHaveLength(2);

      expect(afterResults[0].result).toBe(true);
      expect(afterResults[0].node.ancestry).toEqual(['html > body > iframe#1']);

      expect(afterResults[1].result).toBe(true);
      expect(afterResults[1].node.ancestry).toEqual(['html > body > iframe#2']);
    });

    it('does not change result when iframe has not been tested', () => {
      const results = [
        {
          result: undefined,
          node: {
            ancestry: ['html']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#1']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#2']
          }
        },
        {
          result: false,
          node: {
            ancestry: ['html > body > iframe#3']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#1', 'html']
          }
        }
      ];

      const afterResults = frameTestedAfter(results);
      expect(afterResults).toHaveLength(3);

      expect(afterResults[0].result).toBe(true);
      expect(afterResults[0].node.ancestry).toEqual(['html > body > iframe#1']);

      expect(afterResults[1].result).toBeUndefined();
      expect(afterResults[1].node.ancestry).toEqual(['html > body > iframe#2']);

      expect(afterResults[2].result).toBe(false);
      expect(afterResults[2].node.ancestry).toEqual(['html > body > iframe#3']);
    });

    it('works with shadow DOM', () => {
      const results = [
        {
          result: undefined,
          node: {
            ancestry: ['html']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [['html > body > custom-elm1', 'iframe#1']]
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [['html > body > custom-elm1', 'iframe#2']]
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [['html > body > custom-elm1', 'iframe#1'], 'html']
          }
        }
      ];

      const afterResults = frameTestedAfter(results);
      expect(afterResults).toHaveLength(2);

      expect(afterResults[0].result).toBe(true);
      expect(afterResults[0].node.ancestry).toEqual([
        ['html > body > custom-elm1', 'iframe#1']
      ]);

      expect(afterResults[1].result).toBeUndefined();
      expect(afterResults[1].node.ancestry).toEqual([
        ['html > body > custom-elm1', 'iframe#2']
      ]);
    });

    it('works with nested shadow DOM and iframes', () => {
      const results = [
        {
          result: undefined,
          node: {
            ancestry: ['html']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#1']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [['html > body > custom-elm1', 'iframe#2']]
          }
        },
        {
          result: undefined,
          node: {
            ancestry: ['html > body > iframe#1', 'html']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [['html > body > custom-elm1', 'iframe#2'], 'html']
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [
              ['html > body > custom-elm1', 'iframe#2'],
              ['html > body > other-element', 'iframe#3']
            ]
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [
              ['html > body > custom-elm1', 'iframe#2'],
              ['html > body > other-element', 'iframe#4']
            ]
          }
        },
        {
          result: undefined,
          node: {
            ancestry: [
              ['html > body > custom-elm1', 'iframe#2'],
              ['html > body > other-element', 'iframe#3'],
              'html'
            ]
          }
        }
      ];

      const afterResults = frameTestedAfter(results);
      expect(afterResults).toHaveLength(4);

      expect(afterResults[0].result).toBe(true);
      expect(afterResults[0].node.ancestry).toEqual(['html > body > iframe#1']);

      expect(afterResults[1].result).toBe(true);
      expect(afterResults[1].node.ancestry).toEqual([
        ['html > body > custom-elm1', 'iframe#2']
      ]);

      expect(afterResults[2].result).toBe(true);
      expect(afterResults[2].node.ancestry).toEqual([
        ['html > body > custom-elm1', 'iframe#2'],
        ['html > body > other-element', 'iframe#3']
      ]);

      expect(afterResults[3].result).toBeUndefined();
      expect(afterResults[3].node.ancestry).toEqual([
        ['html > body > custom-elm1', 'iframe#2'],
        ['html > body > other-element', 'iframe#4']
      ]);
    });
  });
});
