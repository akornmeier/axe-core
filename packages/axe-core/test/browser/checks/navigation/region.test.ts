// FIXME(phase-05-sprint-5): 'should test Shadow tree content' fails — relies on legacy `axe._tree[0]` global state pattern; needs rewrite to use fixtureSetup return value or queryFixture instead.
import {
  createMockCheckContext,
  checkSetup,
  fixtureSetup,
  getCheckEvaluateESM,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import regionEvaluate from '@checks/navigation/region-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const regionEvaluateESM = getCheckEvaluateESM(regionEvaluate, {
  regionMatcher: 'dialog, [role=dialog], [role=alertdialog], svg'
});
// NOTE: due to how the region check works to return the top-most
// node that is outside the region, all fixture content will need
// a region node (in most cases the <div role="main">Content</div>)
// in order for the check to not give false positives/negatives.
// adding the region node forces the check to not return the #fixture
// as the top-most element but instead use the #target element.
describe('region', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = regionEvaluateESM;

  const checkContext = new createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe.reset();
  });

  it('should return true when content is inside the region', () => {
    const checkArgs = checkSetup(
      '<div role="main"><a id="target" href="a.html#mainheader">Click Here</a><div><h1 id="mainheader" tabindex="0">Introduction</h1></div></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when a region role is added to standards', () => {
    axe.configure({
      standards: {
        ariaRoles: {
          feed: {
            type: 'landmark'
          }
        }
      }
    });
    const checkArgs = checkSetup(
      '<div role="feed" id="target">This is random content.</div>' +
        '<div role="main"><h1 id="mainheader">Introduction</h1></div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return false when img content is outside the region, no alt attribute at all', () => {
    const checkArgs = checkSetup(`
      <img id="target" src="data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7">
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should return true when img content outside of the region is decorative, via an empty alt attr', () => {
    const checkArgs = checkSetup(`
      <img id="target" src="#" alt="" />
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when img content outside of the region is explicitly decorative, via a presentation role', () => {
    const checkArgs = checkSetup(`
      <img id="target" src="#" role="presentation" />
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return false when img content outside of the region is focusable (implicit role=img)', () => {
    const checkArgs = checkSetup(`
      <img id="target" src="#" tabindex="0" alt="" />
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should return false when img content outside of the region has a global aria attribute (implicit role=img)', () => {
    const checkArgs = checkSetup(`
      <img id="target" src="#" aria-atomic="true" alt="" />
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should return true when canvas role=none', () => {
    const checkArgs = checkSetup(`
      <canvas id="target" role="none" />
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return false when object has an aria-label', () => {
    const checkArgs = checkSetup(`
      <object id="target" aria-label="bar"></object>
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should return false when a non-landmark has text content but a role=none', () => {
    const checkArgs = checkSetup(`
      <div id="target" role="none">apples</div>
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should return true when a non-landmark does NOT have text content and a role=none', () => {
    const checkArgs = checkSetup(`
      <div id="target" role="none"></div>
      <div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when textless text content is outside the region', () => {
    const checkArgs = checkSetup(
      '<p id="target"></p><div role="main"><h1 id="mainheader" tabindex="0">Introduction</h1></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when wrapper content is outside the region', () => {
    const checkArgs = checkSetup(
      '<div id="target"><div role="main"><h1 id="mainheader" tabindex="0">Introduction</h1></div></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when invisible content is outside the region', () => {
    const checkArgs = checkSetup(
      '<p id="target" style="display: none">Click Here</p><div role="main"><h1 id="mainheader" tabindex="0">Introduction</h1></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when there is a skiplink', () => {
    const checkArgs = checkSetup(
      '<a id="target" href="#mainheader">Click Here</a><div role="main"><h1 id="mainheader" tabindex="0">Introduction</h1></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when there is an Angular skiplink', () => {
    const checkArgs = checkSetup(
      '<a id="target" href="/#mainheader">Click Here</a><div role="main"><h1 id="mainheader" tabindex="0">Introduction</h1></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return false when there is a non-region element', () => {
    const checkArgs = checkSetup(
      '<div id="target">This is random content.</div><div role="main"><h1 id="mainheader">Introduction</h1></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should return false when there is a non-skiplink', () => {
    const checkArgs = checkSetup(
      '<a id="target" href="something.html#mainheader">Click Here</a><div role="main"><h1 id="mainheader">Introduction</h1></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should return true if the non-region element is a script', () => {
    const checkArgs = checkSetup(
      '<script id="target">axe.run()</script><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should considered aria labelled elements as content', () => {
    const checkArgs = checkSetup(
      '<div id="target" aria-label="axe-core logo" role="img"></div><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('should allow native header elements', () => {
    const checkArgs = checkSetup(
      '<header id="target">branding</header><main>Content </main><aside>stuff</aside><footer>copyright</footer>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should allow native main elements', () => {
    const checkArgs = checkSetup(
      '<header>branding</header><main id="target">Content </main><aside>stuff</aside><footer>copyright</footer>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should allow native aside elements', () => {
    const checkArgs = checkSetup(
      '<header>branding</header><main>Content </main><aside id="target">stuff</aside><footer>copyright</footer>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should allow native footer elements', () => {
    const checkArgs = checkSetup(
      '<header>branding</header><main>Content </main><aside>stuff</aside><footer id="target">copyright</footer>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('ignores native landmark elements with an overwriting role', () => {
    const checkArgs = checkSetup(
      '<main id="target" role="none">Content</main><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('ignores native landmark elements with an overwriting role with a nested child', () => {
    const checkArgs = checkSetup(`
      <main id="target" role="none"><p>Content</p></main>
			<div role="main">Content</div>
    `);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('returns false for content outside of form tags with accessible names', () => {
    const checkArgs = checkSetup(
      '<p id="target">Text</p><form aria-label="form"></form>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('ignores unlabeled forms as they are not landmarks', () => {
    const checkArgs = checkSetup(
      '<form id="target"><fieldset>foo</fieldset></form><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('treats <forms> with aria label as landmarks', () => {
    const checkArgs = checkSetup(
      '<form id="target" aria-label="foo"><p>This is random content.</p></form><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('treats role=forms with aria label as landmarks', () => {
    const checkArgs = checkSetup(
      '<div role="form" id="target" aria-label="foo"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('treats forms without aria label as not a landmarks', () => {
    const checkArgs = checkSetup(
      '<form id="target"><p>This is random content.</p></form><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('treats forms with an empty aria label as not a landmarks', () => {
    const checkArgs = checkSetup(
      '<form id="target" aria-label=" "><p>This is random content.</p></form><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('treats forms with empty titles not as landmarks', () => {
    const checkArgs = checkSetup(
      '<form id="target" title=""><p>This is random content.</p></form><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('treats ARIA forms with no label or title as landmarks', () => {
    const checkArgs = checkSetup(
      '<div role="form" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('allows content in aria-live=assertive', () => {
    const checkArgs = checkSetup(
      '<div aria-live="assertive" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('allows content in aria-live=polite', () => {
    const checkArgs = checkSetup(
      '<div aria-live="polite" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('does not allow content in aria-live=off', () => {
    const checkArgs = checkSetup(
      '<div aria-live="off" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('allows content in aria-live=assertive with explicit role set', () => {
    const checkArgs = checkSetup(
      '<div aria-live="assertive" role="alert" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('allows content in aria-live=polite with explicit role set', () => {
    const checkArgs = checkSetup(
      '<div aria-live="polite" role="status" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('allows content in implicit aria-live role alert', () => {
    const checkArgs = checkSetup(
      '<div role="alert" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('allows content in implicit aria-live role log', () => {
    const checkArgs = checkSetup(
      '<div role="log" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('allows content in implicit aria-live role status', () => {
    const checkArgs = checkSetup(
      '<div role="status" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('treats role=dialog elements as regions', () => {
    const checkArgs = checkSetup(
      '<div role="dialog" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('treats role=alertdialog elements as regions', () => {
    const checkArgs = checkSetup(
      '<div role="alertdialog" id="target"><p>This is random content.</p></div><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('treats svg elements as regions', () => {
    const checkArgs = checkSetup(
      '<svg id="target"></svg><div role="main">Content</div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('returns the outermost element as the error', () => {
    const checkArgs = checkSetup(
      '<div id="target"><p>This is random content.</p></div><div role="main"><h1 id="mainheader" tabindex="0">Introduction</h1></div>'
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  it('supports options.regionMatcher', () => {
    const checkArgs = checkSetup(
      '<div aria-live="off" id="target"><p>This is random content.</p></div><div role="main">Content</div>',
      {
        regionMatcher: {
          attributes: {
            'aria-live': 'off'
          }
        }
      }
    );

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when there is a button', () => {
    // Some pages have a skiplink menu, that opens through a button
    // ARIA practices is an example of this.
    const checkArgs = checkSetup(
      '<button id="target">Skip menu</button><main><h1>Introduction</h1></main>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should test Shadow tree content',
    function () {
      const div = document.createElement('div');
      const shadow = div.attachShadow({ mode: 'open' });
      shadow.innerHTML = 'Some text';
      fixtureSetup(div);
      const virutalNode = axe._tree[0];

      // fixture is the outermost element
      expect(
        checkEvaluate.call(
          checkContext,
          virutalNode.actualNode,
          null,
          virutalNode
        )
      ).toBe(false);
    }
  );

  (shadowSupport.v1 ? it : it.skip)('should test slotted content', function () {
    const div = document.createElement('div');
    div.innerHTML = 'Some content';
    const shadow = div.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<div role="main"><slot></slot></div>';
    const checkArgs = checkSetup(div);

    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should ignore skiplink targets inside shadow trees',
    function () {
      const div = document.createElement('div');
      div.innerHTML =
        '<a id="target" href="#foo">skiplink</a><div>Content</div>';

      const shadow = div.querySelector('div').attachShadow({ mode: 'open' });
      shadow.innerHTML = '<div role="main" id=#foo"><slot></slot></div>';
      fixtureSetup(div);
      const virutalNode = axe.utils.getNodeFromTree(
        div.querySelector('#target')
      );

      expect(
        checkEvaluate.call(
          checkContext,
          virutalNode.actualNode,
          null,
          virutalNode
        )
      ).toBe(false);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should find the skiplink in shadow DOM',
    function () {
      const div = document.createElement('div');
      div.innerHTML = '<span id="foo">Content!</span>';
      const shadow = div.attachShadow({ mode: 'open' });
      shadow.innerHTML =
        '<a href="#foo">skiplink</a><div role="main"><slot></slot></div>';
      const checkArgs = checkSetup(div);

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
      expect(checkContext._relatedNodes).toHaveLength(0);
    }
  );
});
