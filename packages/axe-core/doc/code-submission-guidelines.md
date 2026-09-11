# Code Submission Guidelines

We've enacted standards for commits and pull requests to effectively manage the project over
time. We expect all code contributed to follow these standards. If your code doesn't follow them, we
will kindly ask you to resubmit it in the correct format.

- [Code Guidelines](#code-guidelines)
- [Git Commits](#git-commits)
- [Submitting a pull request](#submitting-a-pull-request)
- [Merging a pull request](#merging-a-pull-request)
- [Squashing Commits](#squashing-everything-into-one-commit)

## Code Guidelines

### Default Export at Top

When coding using [JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), the `default export` should be at the top of the file right after any import statements and module level variables. This ensures that when you open the file the main code path is the first thing you read.

If you encounter any code that we maintain that does not put the `default export` at the top, you should update the file to do so.

### Return Early / Happy Path Coding

[Return Early Coding](https://medium.com/swlh/return-early-pattern-3d18a41bba8) (also called "[Happy Path Coding](https://medium.com/@matryer/line-of-sight-in-code-186dd7cdea88)") is a coding pattern where you try to keep the main execution flow of the function aligned to a single column edge. Doing so allows someone to quickly scan down the column to see the expected flow or happy path of the function.

In return early coding, the idea is to keep the main execution flow to the left column and use if statements to primarily handle errors or edge cases. This typically means that the function will include many `return` statements instead of the concept of a single return.

In return early coding, we also try to declare variables at the moment they are needed rather than listing them all at the top of the function.

<details>
  <summary>Example of nested execution flow</summary>

```js
import path from 'path';
import { promises as fs } from 'fs';

export default async function validateAxeReport(filePath = '') {
  let valid;
  let file;
  let results;

  if (filePath.trim()) {
    try {
      if (!path.isAbsolute(filePath)) {
        filePath = path.relative(process.cwd(), filePath);
      }
      file = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      throw new Error(`Unable to read file "${filePath}"`);
    }

    try {
      results = JSON.parse(file);
    } catch (err) {
      throw new TypeError(`File "${filePath}" is not a valid JSON file`);
    }

    if (results?.testRunner?.name !== 'axe') {
      throw new TypeError(`File "${filePath}" is not a valid axe results file`);
    }

    valid = validateReportStructure(results);
  } else {
    throw new SyntaxError('No file path provided');
  }

  return valid;
}
```

</details>

<details>
  <summary>Example of return early coding</summary>

```js
import path from 'path';
import { promises as fs } from 'fs';

export default async function validateAxeReport(filePath = '') {
  if (!filePath.trim()) {
    throw new SyntaxError('No file path provided');
  }

  if (!path.isAbsolute(filePath)) {
    filePath = path.relative(process.cwd(), filePath);
  }

  let file;
  try {
    file = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Unable to read file "${filePath}"`);
  }

  let results;
  try {
    results = JSON.parse(file);
  } catch (err) {
    throw new TypeError(`File "${filePath}" is not a valid JSON file`);
  }

  if (results?.testRunner?.name !== 'axe') {
    throw new TypeError(`File "${filePath}" is not a valid axe results file`);
  }

  return validateReportStructure(results);
}
```

</details>

### DocBlock Comments

We use [DocBlock comments](https://en.wikipedia.org/wiki/Docblock) in our code. DocBlock comments are a way to describe what a function does, its signature, and describe its inputs.

<details>
  <summary>Example of DocBlock comment</summary>

```ts
/**
 * Calculate the distance between two points.
 * @param {number[]} pointA The first point represented by the array [x,y]
 * @param {number[]} pointB The second point represented by the array [x,y]
 * @return {number}
 */
function distance(pointA, pointB) {
  return Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);
}
```

</details>

### Tests

All code changes should include tests to validate that the code works as expected. Both unit tests and integration tests (where applicable) should be included in all `fix` and `feat` pull requests. `chore` pull requests do not typically need tests.

#### Integration Test

All changes that affect a rule should include an integration test. Most rules integration tests can be found in `test/integration/rules`. When updating tests in this directory, you'll need to write the new HTML code to be tested and give the element that should trigger the rule a unique `id`. Then you'll need to update the companion JSON file to add the id to either the `violations` or `passes` array.

For example, if we were updating the `aria-roles` rule to fail when using the `command` role, the changes would look as follows:

`test/integration/rules/aria-roles/aria-roles.html`

```diff
+<div role="command" id="fail-command">fail</div>
```

`test/integration/rules/aria-roles/aria-roles.json`

```diff
{
  "description": "aria-roles tests",
  "rule": "aria-roles",
  "violations": [
     ["#fail1"],
-    ["#fail2"]
+    ["#fail2"],
+    ["#fail-command"]
  ]
}
```

Notice that the id added to the `violations` array is inside an array. This is because the `violations` and `passes` arrays are axe-core selectors, which follow the format:

- a single string - the string is the CSS selector
- multiple strings
  - The last string is the final CSS selector
  - All other's are the nested structure of iframes inside the document

## Git Commits

We follow Angular's code contribution style with precise rules for formatting git commit messages.
This leads to more readable messages that are easy to follow when looking through the project
history. We will also use commit messages to generate the axe Changelog document.

A detailed explanation of Angular's guidelines and conventions can be found [on Google Docs](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit#).

### Commit Message Format

Each commit message should consist of a header, a body and a footer. The header has a special format
that includes a type, a scope and a subject. Here's a sample of the format:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Here's an example:

```sh
perf(rule): improve speed of color contrast rules

Use async process to compare elements without UI lockup

Closes issue #1
```

**Note:** We do not link issues to be closed as we have our QA team verify the issue is resolved before closing. Instead use `Closes issue #` to link to the issue the pr resolves but won't close it once merged.

> Commit messages should be 100 characters or less to make them easy to read on GitHub and
> various git tools.

### How to structure your commits:

#### Type

Must be one of the following:

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that do not affect the meaning of the code (white-space, formatting, missing
  semi-colons, etc)
- **refactor:** A code change that neither fixes a bug nor adds a feature
- **perf:** A code change that improves performance
- **test:** Adding missing tests
- **chore:** Changes to the build process or auxiliary tools and libraries such as documentation generation
- **ci:** Changes or fixes to CI configuration such as CircleCI

#### Scope

The scope specifies the place of the commit change in the codebase along with the type. It could
reference a rule, a commons file, or anything really. E.g. `feat(rule)` or
`test(commons/aria)`. It would help us call to out rule changes in our changelog with `rule` used as the scope.

If the scope is too broad to summarize, use the type only and leave off the parentheses. E.g. `type: some subject`. Keep in mind that a long scope often pushes your commit message over 100 characters. Brevity is helpful for everyone!

#### Subject

The subject contains succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

#### Body

Use the imperative, present tense: "change" not "changed" nor "changes", just like the subject. Include the motivation for the change and contrast it with how the code worked before.

#### Footer

Reference any issue that this commit closes with its fully qualified URL to support both Bitbucket and GitHub.

If needed, the footer should contain any information about [Breaking Changes](https://www.conventionalcommits.org/en/v1.0.0/). Deprecation notices or breaking changes in the Changelog should inform users if they'll need to modify their code after this commit.

A breaking change should be noted with `BREAKING CHANGE:` (all caps, followed by a colon) and a message.

```
feat(rules): remove deprecated rules

BREAKING CHANGE: remove rules: th-has-headers, checkboxgroup, radiogroup
```

## Submitting a pull request

Create a short-lived branch from the latest `origin/main`. Before opening a pull request, rebase your branch onto `main`:

```sh
git checkout your-branch
git fetch origin
git rebase origin/main
git push --force-with-lease origin HEAD
```

Use `--force-with-lease` only on your own feature branch when rebasing rewrites commits already pushed. Open a non-draft pull request against `main` and follow the [commit policy](#git-commits) for its title.

## Merging a pull request

`main` is protected. All changes go through pull requests with resolved review conversations. Never push changes directly to `main`, force-push it, or delete it.

Use GitHub's **Squash and merge** after checks and review are complete. If the branch conflicts with `main`, ask its author to rebase using the steps above. The pull request title becomes the squash commit message.

## Squashing everything into one commit

GitHub squashes commits when merging; local squashing is optional. To tidy your own feature branch before review:

```sh
git fetch origin
git rebase --interactive origin/main
git diff origin/main...HEAD
git push --force-with-lease origin HEAD
```

Keep the pull request open for review after rewriting its history. Do not bypass the protected-branch workflow with a manual merge or direct trunk push.

## Writing Integration Tests

For each rule, axe-core needs to have integration tests. These tests are located in `tests/integration`. This directory contains two other directories. `rules`, which contains integration tests that can be run on a single page, and `full` which contains tests that can only be tested by running on multiple pages.

Ensure that for each check used in the rule, there is an integration test for both pass and fail results. Integration tests put in `rules` can be described using simple code snippets in an HTML file, and a JSON file that describes the expected outcome. For `full` tests, a complete Jasmine test should be created, including at least one HTML file that has the tested code, and a JS file that has the test statements.
