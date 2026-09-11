const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const locale = require('../../locales/fr.json');

for (const file of ['axe.fr.js', 'axe.fr.min.js']) {
  describe(`localized bundle ${file}`, () => {
    it('preserves translations in Node and injected browser source', async () => {
      const axe = require(`../../dist/${file}`);
      const dom = new JSDOM('<button></button>', {
        runScripts: 'outside-only'
      });
      try {
        dom.window.eval(axe.source);
        for (const engine of [axe, dom.window.axe]) {
          assert.equal(engine._audit.lang, locale.lang);
          const results = await engine.run(dom.window.document.body, {
            runOnly: ['button-name']
          });
          assert.equal(results.incomplete.length, 0);
          assert.equal(results.violations.length, 1);
          assert.equal(
            results.violations[0].help,
            locale.rules['button-name'].help
          );
        }
      } finally {
        dom.window.close();
      }
    });
  });
}
