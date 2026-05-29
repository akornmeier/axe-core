# Contributing

## Contributor License Agreement

In order to contribute, you must accept the [contributor license agreement](https://cla-assistant.io/dequelabs/axe-core) (CLA). Acceptance of this agreement will be checked automatically and pull requests without a CLA cannot be merged.

## Contribution Guidelines

Submitting code to the project? Please review and follow our
[Git commit and pull request guidelines](doc/code-submission-guidelines.md).

### Code Quality

Although we do not have official code style guidelines, we can and will request you to make changes if we feel the changes are warranted. You can take clues from the existing code base to see what we consider to be reasonable code quality. Please be prepared to make changes that we ask of you even if you might not agree with the request(s).

Please respect the coding style of the files you are changing and adhere to that.

The files in this project are formatted by [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/). Both are run when code is committed. Additionally, you can run ESLint manually:

```console
pnpm run eslint
```

### When to use HTMLElement vs Virtual Node

Axe-core uses an internal copy of the HTML page for most things internal to axe-core (called the Virtual Tree). Each HTML element on the page has an equivalent [Virtual Node](./lib/core/base/virtual-node) element, which allows us to cache or normalize information about the HTML element without mutating the actual DOM node.

Typically we use the Virtual Node when possible, but understand that's not always possible (such as accessing DOM only APIs like `getRootNode` or `getBoundingClientRect`). Furthermore, any function within the [utils directory](./lib/core/utils/) should not use Virtual Nodes. The reason for this is that using Virtual Nodes requires that axe first be [setup](./lib/core/public/setup.js) and create the Virtual Tree. For the most part, util functions are functions that can be run when no Virtual Tree exists.

### Directory Structure

Axe-core

- `standards` - Data objects of the HTML, WCAG, and ARIA standards and specs.
- `core/base` - Defines many of the internal object structures for axe-core (rules, checks, virtual node, etc.).
- `core/imports` - Polyfills or imports from node modules.
- `core/public` - Functions for how axe is run or configured.
- `core/reporters` - The different reporters that configure what data is reported from a run.
- `core/utils` - Utility functions that can be run without needing to set up the Virtual Tree.
- `commons/aria` - Functions that are used to validate ARIA spec or implement ARIA calculations (role, value, etc.).
- `commons/color` - Functions that are used to calculate the foreground or background color of an element.
- `commons/dom` - Functions that access information about the page, DOM, nodes, or its visual state.
- `commons/forms` - Functions for helping with forms and their associated inputs.
- `commons/matches` - Functions used to match a virtual node against a special matcher object.
- `commons/math` - Math functions mainly used for target size and position calculations.
- `commons/standards` - Functions for querying information from `standards`.
- `commons/tables` - Functions for helping with data tables.
- `commons/text` - Functions for calculating the accessible name of an element and handling strings or text related attributes.
- `rules` - JSON metadata files for each axe-core rule as well as their associated matches functions.
- `checks` - JSON metadata files for each axe-core check as well as their associated evaluate functions.

### Import Requirements

Which functions can be imported and how they can be imported depends on where you are trying to import them from. The following is a list of directories and their import restrictions:

- `standards` - Shouldn't use imports as they are just hard coded data objects.
- `core/utils` - Can import other `core/utils`, `core`, `core/base`, or `standards` functions by direct file path (no import from index files).
- `core/public` - Can import other `core/public` by direct file path, or any import allowed by `core/utils` by direct file path.
- `core/imports` - The only files allowed to import from node modules, but shouldn't import from any other directory.
- `core/reporters` Can import from `core/utils` by import from index files.
- `commons` - Can import other `commons` by direct file path, or any import allowed by `core/utils` by import from index files.
- `checks` and `rules` - Can import from any directory by import from index files.

### Shadow DOM

For any proposed changes to rules, checks, commons, or other APIs to be accepted in axe-core, your code must support open Shadow DOM. See [API.md](./doc/API.md) and the [developer guide](./doc/developer-guide.md) for documentation on the available methods and test utilities. You can also look at existing tests for examples using our APIs.

### Testing

We expect all code to be 100% covered by tests. We don't have or want code coverage metrics but we will review tests and suggest changes when we think the test(s) do(es) not adequately exercise the code/code changes.

Tests should be added to the `test` directory using the same file path and name of the source file the test is for. For example, the source file `lib/commons/text/sanitize.ts` should have a test file at `test/browser/commons/text/sanitize.test.ts` (browser-mode tests) or `test/unit/commons/text/sanitize.test.ts` (Node-mode tests).

Axe uses [Vitest 4](https://vitest.dev/) (powered by [Playwright](https://playwright.dev/) in browser mode) as its testing framework.

### Documentation and Comments

Functions should contain a preceding comment block with [jsdoc](http://usejsdoc.org/) style documentation of the function. For example:

```js
/**
 * Runs the Audit; which in turn should call `run` on each rule.
 * @async
 * @param  {Context}   context The scope definition/context for analysis (include/exclude)
 * @param  {Object}    options Options object to pass into rules and/or disable rules or checks
 * @param  {Function} fn       Callback function to fire when audit is complete
 */
```

Classes should contain a jsdoc comment block for each attribute. For example:

```js
/**
 * Constructor for the result of checks
 * @param {Object} check CheckResult specification
 */
function CheckResult(check) {
  /**
   * ID of the check.  Unique in the context of a rule.
   * @type {String}
   */
  this.id = check.id;

  /**
   * Any data passed by Check (by calling `this.data()`)
   * @type {Mixed}
   */
  this.data = null;

  /**
   * Any node that is related to the Check, specified by calling `this.relatedNodes([HTMLElement...])` inside the Check
   * @type {Array}
   */
  this.relatedNodes = [];

  /**
   * The return value of the Check's evaluate function
   * @type {Mixed}
   */
  this.result = null;
}
```

## Setting up your environment

In order to get going, fork and clone the repository. Then, if you do not have [Node.js](https://nodejs.org/download/) installed, install it! Node 20 LTS or later is required.

Once the basic infrastructure is installed, enable Corepack (which manages PNPM):

```console
corepack enable
```

Then from the repository root, install dependencies:

```console
pnpm install
```

Then build the package:

```console
pnpm build
```

## Developing and testing

After `pnpm install`, run the one-time Playwright browser setup so that browser-mode tests have Chromium/Firefox available locally:

```console
pnpm --filter=axe-core exec playwright install chromium firefox
```

On macOS this populates `~/Library/Caches/ms-playwright/`. On Linux/CI runners the browsers go under `~/.cache/ms-playwright/`. No `apt-get` / `brew` system packages are required for local development on macOS; CI runner system dependencies are handled in the workflow configuration.

To run the full Vitest suite (TypeScript typecheck + all three projects: unit, browser, integration):

```console
pnpm test
```

The Vitest workspace is split into three projects. To run a single project:

```console
# Browser-mode tests (Playwright + Chromium) — covers checks, commons,
# core, and rule-matches under test/browser/
pnpm test:vitest:browser

# Integration tests (Playwright + Chromium and Firefox) under test/integration/
pnpm test:vitest:integration
```

To run with coverage (v8 provider; thresholds are configured in `vitest.config.ts`):

```console
pnpm test:vitest --coverage
```

To run in watch mode (re-runs affected tests on file change):

```console
pnpm test:vitest:watch
```

### Preserved Mocha-driven conformance suites (pending Sprint 5b)

A few legacy Mocha-driven conformance suites remain alongside the Vitest suite while their migration is finalized in Sprint 5b. They run the WCAG-ACT, ARIA Practices, locale, virtual-rules, and Selenium-driven cross-browser integration suites against the built bundle:

```console
pnpm test:act               # WCAG-ACT rules conformance (mocha)
pnpm test:apg               # ARIA Practices Guide (mocha + start-server-and-test)
pnpm test:locales           # Locale JSON validation (mocha)
pnpm test:virtual-rules     # Virtual rules conformance (mocha)
pnpm test:integration:chrome   # Selenium WebDriver — Chrome
pnpm test:integration:firefox  # Selenium WebDriver — Firefox
pnpm test:node              # Node-side bundle smoke (no JSDOM)
pnpm test:jsdom             # Node-side bundle smoke (with JSDOM)
```

These commands run the legacy Mocha-driven conformance suites that have not yet been ported to Vitest; they are scheduled for migration in Sprint 5b.

There are also a few non-test scripts that get run during continuous integration:

```console
# Run the tests from `doc/examples/*` using the current local build of `axe.js`
pnpm test:examples
```

## Using axe with TypeScript

### Axe Development

The TypeScript definition file for axe-core is distributed with this module and can be found in [axe.d.ts](./axe.d.ts). It currently supports TypeScript 2.0+.

You can run TypeScript definition tests using the following command:

```console
pnpm run test:tsc
```

## Including axe's type definition in tests

Installing axe to run accessibility tests in your TypeScript project should be as simple as importing the module:

```js
import * as axe from 'axe-core';

describe('Module', () => {
  it('should have no accessibility violations', done => {
    axe.run(compiledFixture).then(results => {
      expect(results.violations.length).toBe(0);
      done();
    }, done);
  });
});
```

## Debugging tests that only fail on CircleCI

First install an X-Windows client on your machine. XQuartz is a good one.

Then follow the [instructions here to connect the X-Windows on CircleCI to XQuartz](https://circleci.com/docs/1.0/browser-debugging/#x11-forwarding-over-ssh)

Start the build using the "Retry the build with SSH enabled" option in the CircleCI interface

Copy the SSH command and add the -X flag to it for example

```console
ssh -X -p 64605 ubuntu@13.58.157.61
```

When you login, set up the environment and start the chrome browser

```console
export DISPLAY=localhost:10.0
/opt/google/chrome/chrome
```

### .Xauthority does not exist

Edit the ~/.Xauthority file and just save it with the following commands

```console
vi ~/.Xauthority
:wq
```

### Starting the web server

Log into a second ssh terminal (without -X) and execute the following commands

```console
cd axe-core
grunt connect watch
```

Load your test file URL in the Chrome browser opened in XQuartz
