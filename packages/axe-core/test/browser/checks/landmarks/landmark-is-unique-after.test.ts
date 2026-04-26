import { createMockCheckContext, axe } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import { describe, it, expect, afterEach } from 'vitest';
const audit = createSyntheticAudit(['landmark-is-unique']);

describe('landmark-is-unique-after', () => {
  const checkContext = createMockCheckContext();
  function createResult(result, data) {
    return {
      result: result,
      data: data
    };
  }

  function createResultWithSameRelatedNodes(result, data) {
    return Object.assign(createResult(result, data), {
      relatedNodes: [createResult(result, data)]
    });
  }

  function createResultWithProvidedRelatedNodes(result, data, relatedNodes) {
    return Object.assign(createResult(result, data), {
      relatedNodes: relatedNodes
    });
  }

  afterEach(() => {
    axe._tree = undefined;
    checkContext.reset();
  });

  it('should update duplicate landmarks with failed result', () => {
    const result = audit.checks['landmark-is-unique'].after([
      createResultWithSameRelatedNodes(true, {
        role: 'some role',
        accessibleText: 'some accessibleText'
      }),
      createResultWithSameRelatedNodes(true, {
        role: 'some role',
        accessibleText: 'some accessibleText'
      }),
      createResultWithSameRelatedNodes(true, {
        role: 'different role',
        accessibleText: 'some accessibleText'
      }),
      createResultWithSameRelatedNodes(true, {
        role: 'some role',
        accessibleText: 'different accessibleText'
      })
    ]);

    const expectedResult = [
      createResultWithProvidedRelatedNodes(
        false,
        {
          role: 'some role',
          accessibleText: 'some accessibleText'
        },
        [
          createResult(true, {
            role: 'some role',
            accessibleText: 'some accessibleText'
          })
        ]
      ),
      createResultWithProvidedRelatedNodes(
        true,
        {
          role: 'different role',
          accessibleText: 'some accessibleText'
        },
        []
      ),
      createResultWithProvidedRelatedNodes(
        true,
        {
          role: 'some role',
          accessibleText: 'different accessibleText'
        },
        []
      )
    ];
    expect(result).toEqual(expectedResult);
  });
});
