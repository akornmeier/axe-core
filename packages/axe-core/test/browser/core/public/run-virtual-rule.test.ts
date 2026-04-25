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
// FIXME(phase-3-sprint-4b): codemod blocker — uses axe._audit (internal state)
describe('axe.runVirtualRule', function () {
  beforeEach(function () {
    axe._load({
      rules: [
        {
          id: 'test',
          selector: '*',
          none: ['fred']
        }
      ],
      checks: [
        {
          id: 'fred',
          evaluate: function () {
            return true;
          }
        }
      ]
    });
  });

  afterEach(function () {
    axe._audit = null;
  });

  it('should throw if the rule does not exist', function () {
    axe._audit.rules = [];
    function fn() {
      axe.runVirtualRule('aria-roles', { nodeName: 'div' });
    }

    expect(fn).toThrow();
  });

  it('should modify the rule to not excludeHidden', function () {
    axe._audit.rules = [
      {
        id: 'aria-roles',
        excludeHidden: true,
        runSync: function () {
          expect(this.excludeHidden).toBe(false);

          return {
            id: 'aria-roles',
            nodes: []
          };
        }
      }
    ];

    axe.runVirtualRule('aria-roles', { nodeName: 'div' });
  });

  it('should not modify the original rule', function () {
    axe._audit.rules = [
      {
        id: 'aria-roles',
        excludeHidden: true,
        runSync: function () {
          expect(this).not.toBe(axe._audit.rules[0]);

          return {
            id: 'aria-roles',
            nodes: []
          };
        }
      }
    ];

    axe.runVirtualRule('aria-roles', { nodeName: 'div' });
  });

  it('should call rule.runSync', function () {
    var called = false;
    axe._audit.rules = [
      {
        id: 'aria-roles',
        runSync: function () {
          called = true;
          return {
            id: 'aria-roles',
            nodes: []
          };
        }
      }
    ];

    axe.runVirtualRule('aria-roles', { nodeName: 'div' });
    expect(called).toBe(true);
  });

  describe('context', () => {
    const { Context } = axe._thisWillBeDeletedDoNotUse.base;
    it('passes context with vNode included to rule.runSync', function () {
      var node = new axe.SerialVirtualNode({ nodeName: 'div' });
      axe._audit.rules = [
        {
          id: 'aria-roles',
          runSync: function (context) {
            expect(typeof context).toBe('object');
            expect(Array.isArray(context.include)).toBe(true);
            expect(context.include[0]).toBe(node);

            return {
              id: 'aria-roles',
              nodes: []
            };
          }
        }
      ];

      axe.runVirtualRule('aria-roles', node);
    });

    it('has all properties a normal context has', () => {
      const contextProps = Object.entries(new Context())
        .filter(arg => typeof arg[1] !== 'function')
        .map(([key]) => key)
        .sort();

      var node = new axe.SerialVirtualNode({ nodeName: 'div' });
      axe._audit.rules = [
        {
          id: 'aria-roles',
          runSync: function (context) {
            const virtualContextProps = Object.keys(context).sort();
            expect(virtualContextProps).toEqual(contextProps);
            return {
              id: 'aria-roles',
              nodes: []
            };
          }
        }
      ];
      axe.runVirtualRule('aria-roles', node);
    });
  });

  it('should pass through options to rule.runSync', function () {
    axe._audit.rules = [
      {
        id: 'aria-roles',
        runSync: function (context, options) {
          expect(options.foo).toBe('bar');

          return {
            id: 'aria-roles',
            nodes: []
          };
        }
      }
    ];

    axe.runVirtualRule('aria-roles', { nodeName: 'div' }, { foo: 'bar' });
  });

  it('should convert a serialised node into a VirtualNode', function () {
    var serialNode = {
      nodeName: 'div',
      foo: 'bar',
      attributes: {
        bar: 'baz'
      }
    };
    axe._audit.rules = [
      {
        id: 'aria-roles',
        runSync: function (context) {
          var node = context.include[0];
          expect(node).toBeInstanceOf(axe.AbstractVirtualNode);
          expect(node.props.foo).toBe('bar');
          expect(node.attr('bar')).toBe('baz');

          return {
            id: 'aria-roles',
            nodes: []
          };
        }
      }
    ];

    axe.runVirtualRule('aria-roles', serialNode);
  });

  it('should return correct structure', function () {
    var results = axe.runVirtualRule('test', { nodeName: 'div' });
    expect(results.violations).toBeDefined();
    expect(results.passes).toBeDefined();
    expect(results.incomplete).toBeDefined();
    expect(results.inapplicable).toBeDefined();
    expect(results.testEngine).toBeDefined();
    expect(results.toolOptions).toBeDefined();
  });
});
