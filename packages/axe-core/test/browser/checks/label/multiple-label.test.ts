import {
  createMockCheckContext,
  fixtureSetup,
  getCheckEvaluate,
  shadowSupport
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('multiple-label', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const shadowSupported = shadowSupport.v1;
  var checkContext = createMockCheckContext();
  afterEach(() => {
    checkContext.reset();
  });

  it('should return undefined if there are multiple implicit labels', () => {
    fixtureSetup(
      '<label id="l2"><label id="l1"><input type="text" id="target"></label></label>'
    );
    var target = fixture.querySelector('#target');
    var l1 = fixture.querySelector('#l1');
    var l2 = fixture.querySelector('#l2');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
    expect(checkContext._relatedNodes).toEqual([l1, l2]);
  });

  it('should return false if there is only one implicit label', () => {
    fixtureSetup('<label id="l1"><input type="text" id="target"></label>');
    var target = fixture.querySelector('#target');
    var l1 = fixture.querySelector('#l1');
    expect(getCheckEvaluate('multiple-label').call(checkContext, target)).toBe(
      false
    );
    expect(checkContext._relatedNodes).toEqual([l1]);
  });

  it('should return undefined if there are multiple explicit labels', () => {
    fixtureSetup(
      '<label id="l1" for="target">Foo</label>' +
        '<label id="l2" for="target">Bar</label>' +
        '<label id="l3" for="target">Bat</label>' +
        '<input type="text" id="target">'
    );
    var target = fixture.querySelector('#target');
    var l1 = fixture.querySelector('#l1');
    var l2 = fixture.querySelector('#l2');
    var l3 = fixture.querySelector('#l3');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
    expect(checkContext._relatedNodes).toEqual([l1, l2, l3]);
  });

  it('should return false if there is only one explicit label', () => {
    fixtureSetup(
      '<label id="l1" for="target">Foo</label><input type="text" id="target">'
    );
    var target = fixture.querySelector('#target');
    var l1 = fixture.querySelector('#l1');
    expect(getCheckEvaluate('multiple-label').call(checkContext, target)).toBe(
      false
    );
    expect(checkContext._relatedNodes).toEqual([l1]);
  });

  it('should return false if there are multiple explicit labels but one is hidden', () => {
    fixtureSetup(
      '<label for="test-input2" id="l1">label one</label>' +
        '<label for="test-input2" style="display:none" id="lnone">label two</label>' +
        '<input id="test-input2" type="text">'
    );
    var target = fixture.querySelector('#test-input2');
    var l1 = fixture.querySelector('#l1');
    expect(getCheckEvaluate('multiple-label').call(checkContext, target)).toBe(
      false
    );
    expect(checkContext._relatedNodes).toEqual([l1]);
  });

  it('should return undefined if there are multiple implicit labels and one is visually hidden', () => {
    fixtureSetup(
      '<label id="l2"><label id="l1" style="opacity: 0"><input type="text" id="target"></label></label>'
    );
    var target = fixture.querySelector('#target');
    var l1 = fixture.querySelector('#l1');
    var l2 = fixture.querySelector('#l2');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
    expect(checkContext._relatedNodes).toEqual([l1, l2]);
  });

  it('should return undefined if there are multiple explicit labels but some are hidden', () => {
    fixtureSetup(
      '<label for="me" id="l1">visible</label>' +
        '<label for="me" style="display:none;" id="l2">hidden</label>' +
        '<label for="me" id="l3">visible</label>' +
        '<input id="me" type="text">'
    );
    var target = fixture.querySelector('#me');
    var l1 = fixture.querySelector('#l1');
    var l3 = fixture.querySelector('#l3');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
    expect(checkContext._relatedNodes).toEqual([l1, l3]);
  });

  it('should return undefined if there are multiple explicit labels and one is visually hidden', () => {
    fixtureSetup(
      '<label for="me" id="l1">visible</label>' +
        '<label for="me" id="l2" style="opacity: 0">visible</label>' +
        '<input id="me" type="text">'
    );
    var target = fixture.querySelector('#me');
    var l1 = fixture.querySelector('#l1');
    var l2 = fixture.querySelector('#l2');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
    expect(checkContext._relatedNodes).toEqual([l1, l2]);
  });

  it('should return undefined if there are multiple explicit labels and one is screen reader hidden', () => {
    fixtureSetup(
      '<label for="me" id="l1">visible</label>' +
        '<label for="me" id="l2" aria-hidden="true">visible</label>' +
        '<input id="me" type="text">'
    );
    var target = fixture.querySelector('#me');
    var l1 = fixture.querySelector('#l1');
    var l2 = fixture.querySelector('#l2');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
    expect(checkContext._relatedNodes).toEqual([l1, l2]);
  });

  it('should return undefined if there are implicit and explicit labels', () => {
    fixtureSetup(
      '<label id="l1" for="target">Foo</label><label id="l2"><input type="text" id="target"></label>'
    );
    var target = fixture.querySelector('#target');
    var l1 = fixture.querySelector('#l1');
    var l2 = fixture.querySelector('#l2');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
    expect(checkContext._relatedNodes).toEqual([l1, l2]);
  });

  it('should return false if there an implicit label uses for attribute', () => {
    fixtureSetup(
      '<label for="target">Foo<input type="text" id="target"></label>'
    );
    var target = fixture.querySelector('#target');
    expect(getCheckEvaluate('multiple-label').call(checkContext, target)).toBe(
      false
    );
  });

  it('should return undefined given multiple labels and no aria-labelledby', () => {
    fixtureSetup(
      '<input type="checkbox" id="A">' +
        '<label for="A">Please</label>' +
        '<label for="A">Excuse</label>' +
        '<label for="A">My</label>' +
        '<label for="A">Dear</label>' +
        '<label for="A">Aunt</label>' +
        '<label for="A">Sally</label>'
    );
    var target = fixture.querySelector('#A');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
  });

  it('should return undefined given multiple labels, one label AT visible, and no aria-labelledby', () => {
    fixtureSetup(
      '<input type="checkbox" id="B">' +
        '<label for="B">Please</label>' +
        '<label for="B" aria-hidden="true">Excuse</label>' +
        '<label for="B" aria-hidden="true">My</label>' +
        '<label for="B" aria-hidden="true">Dear</label>' +
        '<label for="B" aria-hidden="true">Aunt</label>' +
        '<label for="B" aria-hidden="true">Sally</label>'
    );
    var target = fixture.querySelector('#B');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
  });

  it('should return false given multiple labels, one label AT visible, and aria-labelledby for AT visible', () => {
    fixtureSetup(
      '<input type="checkbox" id="D" aria-labelledby="E"/>' +
        '<label for="D" aria-hidden="true">Please</label>' +
        '<label for="D" id="E">Excuse</label>'
    );
    var target = fixture.querySelector('#D');
    expect(getCheckEvaluate('multiple-label').call(checkContext, target)).toBe(
      false
    );
  });

  it('should return false given multiple labels, one label AT visible, and aria-labelledby for all', () => {
    fixtureSetup(
      '<input type="checkbox" id="F" aria-labelledby="G H"/>' +
        '<label for="F" id="G" aria-hidden="true">Please</label>' +
        '<label for="F" id="H">Excuse</label>'
    );
    var target = fixture.querySelector('#F');
    expect(getCheckEvaluate('multiple-label').call(checkContext, target)).toBe(
      false
    );
  });

  it('should return false given multiple labels, one label visible, and no aria-labelledby', () => {
    fixtureSetup(
      '<input type="checkbox" id="I"/>' +
        '<label for="I" style="display:none">Please</label>' +
        '<label for="I" >Excuse</label>'
    );
    var target = fixture.querySelector('#I');
    expect(getCheckEvaluate('multiple-label').call(checkContext, target)).toBe(
      false
    );
  });

  it('should return undefined given multiple labels, all visible, aria-labelledby for all', () => {
    fixtureSetup(
      '<input type="checkbox" id="J" aria-labelledby="K L M N O P">' +
        '<label for="J" id="K">Please</label>' +
        '<label for="J" id="L">Excuse</label>' +
        '<label for="J" id="M">My</label>' +
        '<label for="J" id="N">Dear</label>' +
        '<label for="J" id="O">Aunt</label>' +
        '<label for="J" id="P">Sally</label>'
    );
    var target = fixture.querySelector('#J');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
  });

  it('should return undefined given multiple labels, one AT visible, no aria-labelledby', () => {
    fixtureSetup(
      '<input type="checkbox" id="Q"/>' +
        '<label for="Q" aria-hidden="true"></label>' +
        '<label for="Q" >Excuse</label>'
    );
    var target = fixture.querySelector('#Q');
    expect(
      getCheckEvaluate('multiple-label').call(checkContext, target)
    ).toBeUndefined();
  });

  (shadowSupported ? it : it.skip)(
    'should consider labels in the same document/shadow tree',
    function () {
      fixture.innerHTML = '<div id="target"></div>';
      var target = document.querySelector('#target');
      var shadowRoot = target.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML =
        '<input id="myinput" /><label for="myinput">normal</label>';
      var shadowTarget = target.shadowRoot;
      fixtureSetup();
      expect(
        getCheckEvaluate('multiple-label').call(
          checkContext,
          shadowTarget.firstElementChild
        )
      ).toBe(false);
    }
  );

  (shadowSupported ? it : it.skip)(
    'should return false for valid multiple labels in the same document/shadow tree',
    function () {
      fixture.innerHTML = '<div id="target"></div>';
      var target = document.querySelector('#target');
      var shadowRoot = target.attachShadow({ mode: 'open' });
      var innerHTML = '<input type="checkbox" id="D" aria-labelledby="E"/>';
      innerHTML += '<label for="D" aria-hidden="true">Please</label>';
      innerHTML += '<label for="D" id="E">Excuse</label>';
      shadowRoot.innerHTML = innerHTML;
      fixtureSetup();
      var shadowTarget = target.shadowRoot;
      expect(
        getCheckEvaluate('multiple-label').call(
          checkContext,
          shadowTarget.firstElementChild
        )
      ).toBe(false);
    }
  );

  (shadowSupported ? it : it.skip)(
    'should return undefined for invalid multiple labels in the same document/shadow tree',
    function () {
      fixture.innerHTML = '<div id="target"></div>';
      var target = document.querySelector('#target');
      var shadowRoot = target.attachShadow({ mode: 'open' });
      var innerHTML = '<input type="checkbox" id="Q"/>';
      innerHTML += '<label for="Q" aria-hidden="true"></label>';
      innerHTML += '<label for="Q" >Excuse</label>';
      shadowRoot.innerHTML = innerHTML;
      fixtureSetup();
      var shadowTarget = target.shadowRoot;
      expect(
        getCheckEvaluate('multiple-label').call(
          checkContext,
          shadowTarget.firstElementChild
        )
      ).toBeUndefined();
    }
  );
});
