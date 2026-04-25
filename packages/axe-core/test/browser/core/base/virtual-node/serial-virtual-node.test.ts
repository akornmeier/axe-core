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
describe('SerialVirtualNode', function () {
  var SerialVirtualNode = axe.SerialVirtualNode;

  it('extends AbstractVirtualNode', function () {
    var vNode = new SerialVirtualNode({
      nodeName: 'div'
    });
    expect(vNode).toBeInstanceOf(axe.AbstractVirtualNode);
  });

  describe('props', function () {
    it('assigns any properties to .props', function () {
      var props = {
        nodeType: 1,
        nodeName: 'div',
        someType: 'bar',
        somethingElse: 'baz'
      };
      var vNode = new SerialVirtualNode(props);
      expect(vNode.props).toEqual(props);
    });

    it('returns a frozen object', function () {
      var vNode = new SerialVirtualNode({ nodeName: 'div' });
      expect(Object.isFrozen(vNode.props), 'Expect object to be frozen').toBe(
        true
      );
    });

    it('takes 1 as its nodeType', function () {
      var vNode = new SerialVirtualNode({
        nodeType: 1,
        nodeName: 'div'
      });
      expect(vNode.props.nodeType).toBe(1);
    });

    it('takes 3 as its nodeType', function () {
      var vNode = new SerialVirtualNode({
        nodeType: 3,
        nodeName: '#text'
      });
      expect(vNode.props.nodeType).toBe(3);
    });

    it('has a default nodeType of 1', function () {
      var vNode = new SerialVirtualNode({ nodeName: 'div' });
      expect(vNode.props.nodeType).toBe(1);
    });

    it('does not throw if nodeType is falsy', function () {
      [null, undefined].forEach(function (nonThrowingNodeType) {
        expect(function () {
          // eslint-disable-next-line no-new
          new SerialVirtualNode({
            nodeType: nonThrowingNodeType,
            nodeName: 'div'
          });
        }).not.toThrow();
      });
    });

    it('throws if nodeType is a not a number', function () {
      [true, 'one', '1', { foo: 'bar' }].forEach(function (throwingNodeType) {
        expect(function () {
          // eslint-disable-next-line no-new
          new SerialVirtualNode({
            nodeType: throwingNodeType,
            nodeName: 'div'
          });
        }).toThrow();
      });
    });

    it('converts nodeNames to lower case', function () {
      var htmlNodes = [
        'DIV',
        'SPAN',
        'INPUT',
        'HeAdEr',
        'TABLE',
        'TITLE',
        'BUTTON',
        'Foo'
      ];
      htmlNodes.forEach(function (nodeName) {
        var vNode = new SerialVirtualNode({ nodeName: nodeName });
        expect(vNode.props.nodeName).toBe(nodeName.toLowerCase());
      });
    });

    it('defaults to the correct nodeType for certain nodeNames', function () {
      var vNode1 = new SerialVirtualNode({ nodeName: 'DIV' });
      expect(vNode1.props.nodeType).toBe(1);
      var vNode2 = new SerialVirtualNode({ nodeName: '#cdata-section' });
      expect(vNode2.props.nodeType).toBe(2);
      var vNode3 = new SerialVirtualNode({ nodeName: '#text' });
      expect(vNode3.props.nodeType).toBe(3);
      var vNode8 = new SerialVirtualNode({ nodeName: '#comment' });
      expect(vNode8.props.nodeType).toBe(8);
      var vNode9 = new SerialVirtualNode({ nodeName: '#document' });
      expect(vNode9.props.nodeType).toBe(9);
      var vNode11 = new SerialVirtualNode({ nodeName: '#document-fragment' });
      expect(vNode11.props.nodeType).toBe(11);
    });

    it('defaults to the correct nodeName for certain nodeTypes', function () {
      var vNode2 = new SerialVirtualNode({ nodeType: 2 });
      expect(vNode2.props.nodeName).toBe('#cdata-section');
      var vNode3 = new SerialVirtualNode({ nodeType: 3 });
      expect(vNode3.props.nodeName).toBe('#text');
      var vNode8 = new SerialVirtualNode({ nodeType: 8 });
      expect(vNode8.props.nodeName).toBe('#comment');
      var vNode9 = new SerialVirtualNode({ nodeType: 9 });
      expect(vNode9.props.nodeName).toBe('#document');
      var vNode11 = new SerialVirtualNode({ nodeType: 11 });
      expect(vNode11.props.nodeName).toBe('#document-fragment');
    });

    it('throws if nodeName is not a string', function () {
      [123, true, null, {}, undefined, []].forEach(function (notAString) {
        expect(function () {
          // eslint-disable-next-line no-new
          new SerialVirtualNode({ nodeName: notAString });
        }).toThrow();
      });
    });

    it('ignores the `attributes` property', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz'
        }
      });
      expect(vNode.props.attributes).toBeUndefined();
    });

    it('converts type prop to lower case', function () {
      var types = ['text', 'COLOR', 'Month', 'uRL'];
      types.forEach(function (type) {
        var vNode = new SerialVirtualNode({
          nodeName: 'input',
          type: type
        });
        expect(vNode.props.type).toBe(type.toLowerCase());
      });
    });

    it('converts type attribute to lower case', function () {
      var types = ['text', 'COLOR', 'Month', 'uRL'];
      types.forEach(function (type) {
        var vNode = new SerialVirtualNode({
          nodeName: 'input',
          attributes: {
            type: type
          }
        });
        expect(vNode.props.type).toBe(type.toLowerCase());
      });
    });

    it('defaults type prop to "text"', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'input'
      });
      expect(vNode.props.type).toBe('text');
    });

    it('default type prop to "text" if type is invalid', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'input',
        attributes: {
          type: 'woohoo'
        }
      });
      expect(vNode.props.type).toBe('text');
    });

    it('uses the type property over the type attribute', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'input',
        type: 'month',
        attributes: {
          type: 'color'
        }
      });
      expect(vNode.props.type).toBe('month');
    });

    it('reflects checkbox properties', () => {
      var vNode = new SerialVirtualNode({
        nodeName: 'input',
        type: 'checkbox',
        checked: true,
        indeterminate: true
      });
      expect(vNode.props.checked).toBe(true);
      expect(vNode.props.indeterminate).toBe(true);
    });
  });

  describe('attr', function () {
    it('returns a string value for the attribute', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          foo: 'foo',
          bar: 123,
          baz: true,
          qux: ''
        }
      });
      expect(vNode.attr('foo')).toBe('foo');
      expect(vNode.attr('bar')).toBe('123');
      expect(vNode.attr('baz')).toBe('true');
      expect(vNode.attr('qux')).toBe('');
    });

    it('returns null if the attribute is null', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: { foo: null }
      });
      expect(vNode.attr('foo')).toBeNull();
    });

    it('returns null if the attribute is not set', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div'
      });
      expect(vNode.attr('foo')).toBeNull();
    });

    it('throws if the value is an object (for except null)', function () {
      [{}, [], /foo/].forEach(function (someObject) {
        expect(function () {
          // eslint-disable-next-line no-new
          new SerialVirtualNode({
            nodeName: 'div',
            attributes: { foo: someObject }
          });
        }).toThrow();
      });
    });

    it('converts `className` to `class`', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          className: 'foo bar baz'
        }
      });
      expect(vNode.attr('class')).toBe('foo bar baz');
    });

    it('converts `htmlFor` to `for`', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          htmlFor: 'foo'
        }
      });
      expect(vNode.attr('for')).toBe('foo');
    });
  });

  describe('hasAttr', function () {
    it('returns true if the attribute has a value', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          foo: '',
          bar: 0,
          baz: false
        }
      });
      expect(vNode.hasAttr('foo')).toBe(true);
      expect(vNode.hasAttr('bar')).toBe(true);
      expect(vNode.hasAttr('baz')).toBe(true);
    });

    it('returns true if the attribute is null', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: { foo: null }
      });
      expect(vNode.hasAttr('foo')).toBe(true);
    });

    it('returns false if the attribute is undefined', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: { foo: undefined }
      });
      expect(vNode.hasAttr('foo')).toBe(false);
      expect(vNode.hasAttr('bar')).toBe(false);
    });

    it('converts `htmlFor` to `for`', function () {
      var nodeWithoutFor = new SerialVirtualNode({
        nodeName: 'div',
        attributes: {}
      });
      var nodeWithFor = new SerialVirtualNode({
        nodeName: 'div',
        attributes: { htmlFor: 'foo' }
      });

      expect(nodeWithoutFor.hasAttr('for')).toBe(false);
      expect(nodeWithFor.hasAttr('for')).toBe(true);
    });

    it('converts `className` to `class`', function () {
      var nodeWithoutClass = new SerialVirtualNode({
        nodeName: 'div',
        attributes: {}
      });
      var nodeWithClass = new SerialVirtualNode({
        nodeName: 'div',
        attributes: { className: 'foo bar baz' }
      });

      expect(nodeWithoutClass.hasAttr('class')).toBe(false);
      expect(nodeWithClass.hasAttr('class')).toBe(true);
    });
  });

  describe('attrNames', function () {
    it('should return a list of attribute names', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div',
        attributes: { foo: 'bar' }
      });

      expect(vNode.attrNames).toEqual(['foo']);
    });

    it('should return an empty array if there are no attributes', function () {
      var vNode = new SerialVirtualNode({
        nodeName: 'div'
      });
      expect(vNode.attrNames).toEqual([]);
    });
  });
});
