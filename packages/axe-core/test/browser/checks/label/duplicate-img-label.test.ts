import {
  checkSetup,
  getCheckEvaluateESM,
  flatTreeSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import duplicateImgLabelEvaluate from '@checks/label/duplicate-img-label-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const duplicateImgLabelEvaluateESM = getCheckEvaluateESM(
  duplicateImgLabelEvaluate,
  { parentSelector: 'button, [role=button], a[href], p, li, td, th' }
);
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
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    const result = duplicateImgLabelEvaluateESM(
      node,
      undefined,
      axe.utils.getNodeFromTree(node)
    );
    expect(result).toBe(false);
  });

  it('should return false if aria-label duplicates img alt', () => {
    fixture.innerHTML =
      '<button aria-label="Plain text"><img id="target" alt="Plain text"></button>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return false if img and text have different text', () => {
    fixture.innerHTML =
      '<button><img id="target" alt="Alt text">Plain text</button>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return true if img and text have the same text', () => {
    fixture.innerHTML =
      '<button><img id="target" alt="Plain text">Plain text</button>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
  });

  it('should return true if img has ARIA label with the same text', () => {
    fixture.innerHTML =
      '<button><img id="target" aria-label="Plain text">Plain text</button>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
  });

  it('should return false if img and text are both blank', () => {
    fixture.innerHTML = '<button><img id="target" alt=""></button>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return false if img and text have superset/subset text', () => {
    fixture.innerHTML =
      '<button><img id="target" alt="Plain text and more">Plain text</button>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return false if img does not have required parent', () => {
    fixture.innerHTML =
      '<main><img id="target" alt="Plain text and more"><p>Plain text</p></main>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should support options.parentSelector', () => {
    fixture.innerHTML =
      '<div aria-label="Plain text"><img id="target" alt="Plain text"></div>';
    const node = fixture.querySelector('#target');
    flatTreeSetup(fixture);
    expect(
      duplicateImgLabelEvaluateESM(
        node,
        { parentSelector: 'div' },
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should return true if the img is part of a shadow tree',
    function () {
      const button = document.createElement('div');
      button.setAttribute('role', 'button');
      button.innerHTML = 'My button';
      const shadow = button.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot><img id="target" alt="My button">';
      fixture.appendChild(button);
      flatTreeSetup(fixture);
      const node = shadow.querySelector('#target');
      expect(
        duplicateImgLabelEvaluateESM(
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
      const button = document.createElement('div');
      button.setAttribute('role', 'button');
      button.innerHTML = '<img id="target" alt="My button">';
      const shadow = button.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span>My button</span> <slot></slot>';

      fixture.appendChild(button);
      flatTreeSetup(fixture);
      const node = button.querySelector('#target');
      expect(
        duplicateImgLabelEvaluateESM(
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
      const button = document.createElement('div');
      button.setAttribute('role', 'button');
      button.innerHTML = 'My button';
      const shadow = button.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot><img alt="My image">';
      const checkArgs = checkSetup(button);

      expect(duplicateImgLabelEvaluateESM.apply(null, checkArgs)).toBe(false);
    }
  );
});
