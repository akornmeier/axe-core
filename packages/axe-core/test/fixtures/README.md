# Test Fixtures

Vitest tests load HTML fixtures using one of three conventions, picked by
complexity. The helper API lives in
[`../setup/fixture-helpers.ts`](../setup/fixture-helpers.ts).

## 1. Inline template literals (preferred for simple cases)

For small, single-purpose markup the fixture should be the test's literal
input — no separate file, no `loadHTMLFixture` round-trip:

```ts
import { createFixture } from '../setup/fixture-helpers';

it('flags a button with no accessible name', () => {
  const fixture = createFixture(`<button id="target"></button>`);
  expect(check(fixture.querySelector('#target'))).toBe(false);
});
```

## 2. File imports from `test/fixtures/*.html` (medium complexity)

Use a real `.html` file in this directory when the markup is large enough
that an inline string would obscure the test, or when the same fixture is
shared across several tests:

```ts
import { createFixture, loadHTMLFixture } from '../setup/fixture-helpers';

it('passes APG combobox pattern', async () => {
  const html = await loadHTMLFixture('test/fixtures/apg/combobox.html');
  const fixture = createFixture(html);
  // …
});
```

## 3. `page.goto()` against the Vite dev server (full-page integration only)

For full-document `axe.run()` integration tests where the entire HTML
document — including `<head>`, scripts, stylesheets — is the input, use
the Playwright bridge:

```ts
import { runAxeOnPage } from '../setup/fixture-helpers';
import { AxeResultsSchema } from '@axe-core/schemas';

it('reports zero violations on the empty page', async () => {
  const results = await runAxeOnPage('/test/fixtures/integration/empty.html');
  expect(results).toMatchSchema(AxeResultsSchema);
});
```

## Notes

- The auto-fixture container created by the `beforeEach` hook in
  `vitest.setup.ts` is enough for most tests; reach for `createFixture`
  only when a test needs a _second_ container.
- Per-test fixture isolation is the parallel-safety property the migration
  plan calls for — never lean on a shared `<div id="fixture">` across tests.
