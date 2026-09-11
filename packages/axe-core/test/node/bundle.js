const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const sinon = require('sinon');

const html = name =>
  `<!doctype html><html lang="en"><title>Bundle test</title><body><main><button>${name}</button></main></body></html>`;
const options = { runOnly: ['button-name'] };

for (const file of ['axe.js', 'axe.min.js', 'axe.cjs', 'axe.mjs']) {
  describe(`bundle ${file}`, () => {
    let axe;
    let cryptoCalls;
    const hostGlobals = () =>
      ['window', 'document', 'axe'].map(key =>
        Object.getOwnPropertyDescriptor(globalThis, key)
      );
    const originalGlobals = hostGlobals();

    before(async () => {
      const filePath = path.resolve(__dirname, '../../dist', file);
      const cryptoSpy = sinon.spy(globalThis.crypto, 'getRandomValues');
      try {
        axe = file.endsWith('.mjs')
          ? (await import(pathToFileURL(filePath).href)).default
          : require(filePath);
      } finally {
        cryptoCalls = cryptoSpy.callCount;
        cryptoSpy.restore();
      }
    });

    afterEach(() => {
      assert.deepEqual(hostGlobals(), originalGlobals);
    });

    it('uses host crypto during initialization without a DOM', () => {
      assert.ok(cryptoCalls > 0);
    });

    it('exports live audit state and runs against successive documents', async () => {
      assert.ok(axe._audit);
      const bad = new JSDOM(html(''));
      const good = new JSDOM(html('Save'));
      try {
        const failed = await axe.run(bad.window.document.body, options);
        assert.equal(failed.violations.length, 1);
        assert.equal(failed.violations[0].id, 'button-name');
        assert.equal(failed.incomplete.length, 0);

        const passed = await axe.run(good.window.document.body, options);
        assert.equal(passed.violations.length, 0);
        assert.equal(passed.passes.length, 1);
        assert.equal(passed.incomplete.length, 0);
      } finally {
        bad.window.close();
        good.window.close();
      }
    });

    it('provides browser-injectable source', async () => {
      assert.equal(typeof axe.source, 'string');
      const dom = new JSDOM(html(''), { runScripts: 'outside-only' });
      try {
        dom.window.eval(axe.source);
        assert.equal(dom.window.axe.version, axe.version);
        const results = await dom.window.axe.run(options);
        assert.equal(results.violations.length, 1);
        assert.equal(results.violations[0].id, 'button-name');
        assert.equal(results.incomplete.length, 0);
      } finally {
        dom.window.close();
      }
    });
  });
}
