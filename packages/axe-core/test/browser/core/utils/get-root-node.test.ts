import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe, shadowSupport } from '@helpers/check-helpers';

function makeShadowTreeGRN(node) {
  var root = node.attachShadow({ mode: 'open' });
  var div = document.createElement('div');
  div.className = 'parent';
  root.appendChild(div);
}

describe('axe.utils.getRootNode', function () {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });

  var shadowSupported = shadowSupport.v1;

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should return the document when the node is just a normal node', function () {
    fixture.innerHTML = '<div id="target"></div>';
    var node = document.getElementById('target');
    expect(axe.utils.getRootNode(node) === document).toBe(true);
  });
  it('should return the document when the node is disconnected', function () {
    var node = document.createElement('div');
    expect(axe.utils.getRootNode(node) === document).toBe(true);
  });
  (shadowSupported ? it : xit)(
    'should return the shadow root when it is inside the shadow DOM',
    function () {
      var shadEl;
      // shadow DOM v1 - note: v0 is compatible with this code, so no need
      // to specifically test this
      fixture.innerHTML = '<div></div>';
      makeShadowTreeGRN(fixture.firstChild);
      shadEl = fixture.firstChild.shadowRoot.querySelector('div');
      expect(axe.utils.getRootNode(shadEl) !== document).toBe(true);
      expect(
        axe.utils.getRootNode(shadEl) === fixture.firstChild.shadowRoot
      ).toBe(true);
    }
  );
});
