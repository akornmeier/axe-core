import {
  checkSetup,
  getCheckEvaluate,
  flatTreeSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('duplicate-img-label', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
  });

  it('should return false if no text is present', () => {
    fixture.innerHTML = '<button><img id="target" alt="Plain text"></button>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    var result = getCheckEvaluate('duplicate-img-label')(
      node,
      undefined,
      axe.utils.getNodeFromTree(node)
    );
    expect(result).toBe(false);
  });

  it('should return false if aria-label duplicates img alt', () => {
    fixture.innerHTML =
      '<button aria-label="Plain text"><img id="target" alt="Plain text"></button>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return false if img and text have different text', () => {
    fixture.innerHTML =
      '<button><img id="target" alt="Alt text">Plain text</button>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return true if img and text have the same text', () => {
    fixture.innerHTML =
      '<button><img id="target" alt="Plain text">Plain text</button>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
  });

  it('should return true if img has ARIA label with the same text', () => {
    fixture.innerHTML =
      '<button><img id="target" aria-label="Plain text">Plain text</button>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
  });

  it('should return false if img and text are both blank', () => {
    fixture.innerHTML = '<button><img id="target" alt=""></button>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return false if img and text have superset/subset text', () => {
    fixture.innerHTML =
      '<button><img id="target" alt="Plain text and more">Plain text</button>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return false if img does not have required parent', () => {
    fixture.innerHTML =
      '<main><img id="target" alt="Plain text and more"><p>Plain text</p></main>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should support options.parentSelector', () => {
    fixture.innerHTML =
      '<div aria-label="Plain text"><img id="target" alt="Plain text"></div>';
    var node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('duplicate-img-label')(
        node,
        { parentSelector: 'div' },
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should return true if the img is part of a shadow tree',
    function () {
      var button = document.createElement('div');
      button.setAttribute('role', 'button');
      button.innerHTML = 'My button';
      var shadow = button.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot><img id="target" alt="My button">';
      fixture.appendChild(button);
      flatTreeSetup(fixture);
      var node = shadow.querySelector('#target');
      expect(
        getCheckEvaluate('duplicate-img-label')(
          node,
          undefined,
          axe.utils.getNodeFromTree(node)
        )
      ).toBe(true);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should return true if the img is a slotted element',
    function () {
      var button = document.createElement('div');
      button.setAttribute('role', 'button');
      button.innerHTML = '<img id="target" alt="My button">';
      var shadow = button.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span>My button</span> <slot></slot>';

      fixture.appendChild(button);
      flatTreeSetup(fixture);
      var node = button.querySelector('#target');
      expect(
        getCheckEvaluate('duplicate-img-label')(
          node,
          undefined,
          axe.utils.getNodeFromTree(node)
        )
      ).toBe(true);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should return false if the shadow img has a different text',
    function () {
      var button = document.createElement('div');
      button.setAttribute('role', 'button');
      button.innerHTML = 'My button';
      var shadow = button.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot><img alt="My image">';
      var checkArgs = checkSetup(button);

      expect(
        getCheckEvaluate('duplicate-img-label').apply(null, checkArgs)
      ).toBe(false);
    }
  );
});
