# Oxlint Migration Gaps

This document tracks ESLint rules from `packages/axe-core/eslint.config.js` that do not have
direct equivalents in Oxlint and must be addressed separately (e.g., via custom scripts,
ESLint running in parallel during transition, or future Oxlint plugin support).

## no-restricted-syntax (AST selector-based)

Oxlint does not support `no-restricted-syntax` with arbitrary AST selectors. The following
project-specific restrictions have no Oxlint equivalent:

### Global restrictions (all files)

1. **`node.tagName` usage** — Selector: `MemberExpression[property.name=tagName]`
   - Message: "Don't use node.tagName, use node.nodeName instead."

2. **`node.attributes` usage** — Selector: `MemberExpression[object.name=node][property.name=attributes]`
   - Message: "Don't use node.attributes, use node.hasAttributes() or axe.utils.getNodeAttributes(node) instead."

3. **`vNode.actualNode.attributes` usage** — Selector: `MemberExpression[object.property.name=actualNode][property.name=attributes]`
   - Message: "Don't use node.attributes, use node.hasAttributes() or axe.utils.getNodeAttributes(node) instead."

4. **`node.contains()` usage** — Selector: `CallExpression[callee.object.name=node][callee.property.name=contains]`
   - Message: "Don't use node.contains(node2) as it doesn't work across shadow DOM. Use axe.utils.contains(node, node2) instead."

5. **`vNode.actualNode.contains()` usage** — Selector: `CallExpression[callee.object.property.name=actualNode][callee.property.name=contains]`
   - Message: "Don't use node.contains(node2) as it doesn't work across shadow DOM. Use axe.utils.contains(node, node2) instead."

### Utils-specific restrictions (`lib/core/utils/**`)

6. **`vNode.*` usage in utils** — Selector: `MemberExpression[object.name=vNode]`
   - Message: "Utils is meant for utility functions that work independently of axe's state; utilities that require the virtual tree to be set up should go in commons, not utils."

7. **`virtualNode.*` usage in utils** — Selector: `MemberExpression[object.name=virtualNode]`
   - Message: Same as above.

## no-restricted-imports (pattern-based)

Oxlint supports `no-restricted-imports` but only for specific named module patterns, not
regex-based path patterns. The following ESLint import restrictions have no Oxlint equivalent:

1. **All files (except `lib/core/imports/`)**: Disallow imports from node_modules (regex: `^[^.]`)
2. **`lib/standards/`**: Disallow all imports (standards are plain data objects)
3. **`lib/core/utils/`**: Disallow imports from commons, public, checks, rules
4. **`lib/core/public/`**: Disallow imports from commons, checks, rules
5. **`lib/core/imports/`**: Disallow relative imports (only node_modules allowed)
6. **`lib/core/reporters/`**: Disallow imports from commons, base, public, checks, rules
7. **`lib/commons/`**: Disallow imports from checks and rules

## wrap-iife

The `wrap-iife` rule (enforce wrapping IIFEs) is not available in Oxlint.

## Formatting rules (handled by Prettier)

The following rules were set to `0` (off) in ESLint and are handled by Prettier:
- `no-plusplus`, `max-len`, `semi`, `linebreak-style`

These do not need Oxlint equivalents since Prettier/Oxfmt handles formatting.

## Mitigation Strategy

During the transition period, ESLint remains in place alongside Oxlint to cover these gaps.
Once Oxlint adds plugin support for custom AST rules, the `no-restricted-syntax` and
`no-restricted-imports` rules can be migrated. Until then:

1. **Keep ESLint** for the `no-restricted-syntax` and `no-restricted-imports` rules only
2. **Use Oxlint** for all standard linting rules (faster execution)
3. **CI runs both** linters until full migration is complete
