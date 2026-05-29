import { axe } from '@helpers/check-helpers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
describe('axe.reset', function () {
  let fixture: HTMLElement;
  // var Rule = axe._thisWillBeDeletedDoNotUse.base.Rule;
  afterEach(function () {
    fixture.innerHTML = '';
  });

  beforeEach(function () {
    fixture = document.getElementById('fixture') as HTMLElement;
    axe._audit = null;
  });

  it('should throw if no audit is configured', function () {
    expect(function () {
      axe.reset(
        function () {},
        function () {}
      );
    }).toThrow(Error, /^No audit configured/);
  });

  it('should restore the default configuration', function () {
    axe._load({
      data: {
        rules: {
          bob: {
            knows: 'not-joe'
          }
        }
      },
      rules: [
        {
          id: 'bob',
          selector: 'fail'
        }
      ],
      reporter: 'v2'
    });
    expect(axe._audit.rules).toHaveLength(1);
    // TODO: this does not work yet thanks to webpack
    // assert.instanceOf(axe._audit.rules[0], Rule);
    expect(axe._audit.rules[0].id).toBe('bob');
    expect(axe._audit.rules[0].selector).toBe('fail');
    expect(axe._audit.reporter).toBe('v2');

    axe.configure({
      rules: [
        {
          id: 'bob',
          selector: 'pass',
          metadata: {
            knows: 'joe'
          }
        }
      ],
      reporter: 'raw'
    });
    expect(axe._audit.rules).toHaveLength(1);
    // assert.instanceOf(axe._audit.rules[0], Rule);
    expect(axe._audit.rules[0].id).toBe('bob');
    expect(axe._audit.rules[0].selector).toBe('pass');
    expect(axe._audit.reporter).toBe('raw');
    expect(axe._audit.data.rules.bob.knows).toBe('joe');

    axe.reset();

    expect(axe._audit.rules).toHaveLength(1);
    // assert.instanceOf(axe._audit.rules[0], Rule);
    expect(axe._audit.rules[0].id).toBe('bob');
    expect(axe._audit.rules[0].selector).toBe('fail');
    expect(axe._audit.reporter).toBe('v2');
    expect(axe._audit.data.rules.bob.knows).toBe('not-joe');
  });

  describe('when custom locale was provided', function () {
    beforeEach(function () {
      axe._load({
        data: {
          checks: {
            banana: {
              impact: 'serious',
              messages: {
                pass: 'yay',
                fail: 'boo',
                incomplete: 'donno'
              }
            }
          }
        },
        checks: [
          {
            id: 'banana',
            evaluate: function () {}
          }
        ]
      });
    });

    it('should restore the original locale', function () {
      axe.configure({
        locale: {
          checks: {
            banana: {
              pass: 'wonderful',
              fail: 'horrible job',
              incomplete: 'donno'
            }
          }
        }
      });

      axe.reset();

      var banana = axe._audit.data.checks.banana;
      expect(banana.impact).toBe('serious');
      expect(banana.messages.pass).toBe('yay');
      expect(banana.messages.fail).toBe('boo');
      expect(banana.messages.incomplete).toBe('donno');
    });
  });

  it('should restore standards object', function () {
    axe._load({});

    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-live': {
            type: 'string'
          }
        }
      }
    });

    axe.reset();

    var ariaLiveAttr = axe._audit.standards.ariaAttrs['aria-live'];
    expect(ariaLiveAttr.type).toBe('nmtoken');
  });
});
