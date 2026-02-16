#!/bin/bash
# Cleanup script: Delete .js files that have .ts counterparts in packages/axe-core/lib/
# Run from: /Users/tk/Code/axe-core
set -e

cd /Users/tk/Code/axe-core

# core/ top-level (5 files)
git rm \
  packages/axe-core/lib/core/_exposed-for-testing.js \
  packages/axe-core/lib/core/constants.js \
  packages/axe-core/lib/core/core.js \
  packages/axe-core/lib/core/index.js \
  packages/axe-core/lib/core/log.js

# core/base/ (8 files)
git rm \
  packages/axe-core/lib/core/base/audit.js \
  packages/axe-core/lib/core/base/cache.js \
  packages/axe-core/lib/core/base/check-result.js \
  packages/axe-core/lib/core/base/check.js \
  packages/axe-core/lib/core/base/context.js \
  packages/axe-core/lib/core/base/metadata-function-map.js \
  packages/axe-core/lib/core/base/rule-result.js \
  packages/axe-core/lib/core/base/rule.js

# core/base/context/ (3 files)
git rm \
  packages/axe-core/lib/core/base/context/create-frame-context.js \
  packages/axe-core/lib/core/base/context/normalize-context.js \
  packages/axe-core/lib/core/base/context/parse-selector-array.js

# core/base/virtual-node/ (3 files)
git rm \
  packages/axe-core/lib/core/base/virtual-node/abstract-virtual-node.js \
  packages/axe-core/lib/core/base/virtual-node/serial-virtual-node.js \
  packages/axe-core/lib/core/base/virtual-node/virtual-node.js

# core/public/ (15 files)
git rm \
  packages/axe-core/lib/core/public/cleanup.js \
  packages/axe-core/lib/core/public/configure.js \
  packages/axe-core/lib/core/public/finish-run.js \
  packages/axe-core/lib/core/public/frame-messenger.js \
  packages/axe-core/lib/core/public/get-rules.js \
  packages/axe-core/lib/core/public/load.js \
  packages/axe-core/lib/core/public/plugins.js \
  packages/axe-core/lib/core/public/reporter.js \
  packages/axe-core/lib/core/public/reset.js \
  packages/axe-core/lib/core/public/run-partial.js \
  packages/axe-core/lib/core/public/run-rules.js \
  packages/axe-core/lib/core/public/run-virtual-rule.js \
  packages/axe-core/lib/core/public/run.js \
  packages/axe-core/lib/core/public/setup.js \
  packages/axe-core/lib/core/public/teardown.js

# core/public/run/ (2 files)
git rm \
  packages/axe-core/lib/core/public/run/globals-setup.js \
  packages/axe-core/lib/core/public/run/normalize-run-params.js

# core/reporters/ (6 files)
git rm \
  packages/axe-core/lib/core/reporters/na.js \
  packages/axe-core/lib/core/reporters/no-passes.js \
  packages/axe-core/lib/core/reporters/raw-env.js \
  packages/axe-core/lib/core/reporters/raw.js \
  packages/axe-core/lib/core/reporters/v1.js \
  packages/axe-core/lib/core/reporters/v2.js

# core/reporters/helpers/ (4 files)
git rm \
  packages/axe-core/lib/core/reporters/helpers/failure-summary.js \
  packages/axe-core/lib/core/reporters/helpers/incomplete-fallback-msg.js \
  packages/axe-core/lib/core/reporters/helpers/index.js \
  packages/axe-core/lib/core/reporters/helpers/process-aggregate.js

# core/utils/ (88 files - all have .ts counterparts)
git rm \
  packages/axe-core/lib/core/utils/aggregate-checks.js \
  packages/axe-core/lib/core/utils/aggregate-node-results.js \
  packages/axe-core/lib/core/utils/aggregate-result.js \
  packages/axe-core/lib/core/utils/aggregate.js \
  packages/axe-core/lib/core/utils/are-styles-set.js \
  packages/axe-core/lib/core/utils/assert.js \
  packages/axe-core/lib/core/utils/check-helper.js \
  packages/axe-core/lib/core/utils/clone.js \
  packages/axe-core/lib/core/utils/closest.js \
  packages/axe-core/lib/core/utils/collect-results-from-frames.js \
  packages/axe-core/lib/core/utils/contains.js \
  packages/axe-core/lib/core/utils/css-parser.js \
  packages/axe-core/lib/core/utils/deep-merge.js \
  packages/axe-core/lib/core/utils/dq-element.js \
  packages/axe-core/lib/core/utils/element-matches.js \
  packages/axe-core/lib/core/utils/escape-selector.js \
  packages/axe-core/lib/core/utils/extend-meta-data.js \
  packages/axe-core/lib/core/utils/filter-html-attrs.js \
  packages/axe-core/lib/core/utils/finalize-result.js \
  packages/axe-core/lib/core/utils/find-by.js \
  packages/axe-core/lib/core/utils/frame-messenger.js \
  packages/axe-core/lib/core/utils/get-all-checks.js \
  packages/axe-core/lib/core/utils/get-ancestry.js \
  packages/axe-core/lib/core/utils/get-base-lang.js \
  packages/axe-core/lib/core/utils/get-check-message.js \
  packages/axe-core/lib/core/utils/get-check-option.js \
  packages/axe-core/lib/core/utils/get-environment-data.js \
  packages/axe-core/lib/core/utils/get-flattened-tree.js \
  packages/axe-core/lib/core/utils/get-frame-contexts.js \
  packages/axe-core/lib/core/utils/get-friendly-uri-end.js \
  packages/axe-core/lib/core/utils/get-node-attributes.js \
  packages/axe-core/lib/core/utils/get-node-from-tree.js \
  packages/axe-core/lib/core/utils/get-root-node.js \
  packages/axe-core/lib/core/utils/get-rule.js \
  packages/axe-core/lib/core/utils/get-scroll-state.js \
  packages/axe-core/lib/core/utils/get-scroll.js \
  packages/axe-core/lib/core/utils/get-selector.js \
  packages/axe-core/lib/core/utils/get-shadow-selector.js \
  packages/axe-core/lib/core/utils/get-standards.js \
  packages/axe-core/lib/core/utils/get-stylesheet-factory.js \
  packages/axe-core/lib/core/utils/get-xpath.js \
  packages/axe-core/lib/core/utils/index.js \
  packages/axe-core/lib/core/utils/inject-style.js \
  packages/axe-core/lib/core/utils/is-array-like.js \
  packages/axe-core/lib/core/utils/is-context.js \
  packages/axe-core/lib/core/utils/is-hidden.js \
  packages/axe-core/lib/core/utils/is-html-element.js \
  packages/axe-core/lib/core/utils/is-node-in-context.js \
  packages/axe-core/lib/core/utils/is-shadow-root.js \
  packages/axe-core/lib/core/utils/is-xhtml.js \
  packages/axe-core/lib/core/utils/match-ancestry.js \
  packages/axe-core/lib/core/utils/matches.js \
  packages/axe-core/lib/core/utils/memoize.js \
  packages/axe-core/lib/core/utils/merge-results.js \
  packages/axe-core/lib/core/utils/node-lookup.js \
  packages/axe-core/lib/core/utils/node-serializer.js \
  packages/axe-core/lib/core/utils/node-sorter.js \
  packages/axe-core/lib/core/utils/normalize-run-options.js \
  packages/axe-core/lib/core/utils/object-has-own.js \
  packages/axe-core/lib/core/utils/parse-crossorigin-stylesheet.js \
  packages/axe-core/lib/core/utils/parse-sameorigin-stylesheet.js \
  packages/axe-core/lib/core/utils/parse-stylesheet.js \
  packages/axe-core/lib/core/utils/parse-tabindex.js \
  packages/axe-core/lib/core/utils/performance-timer.js \
  packages/axe-core/lib/core/utils/pollyfill-elements-from-point.js \
  packages/axe-core/lib/core/utils/preload-cssom.js \
  packages/axe-core/lib/core/utils/preload-media.js \
  packages/axe-core/lib/core/utils/preload.js \
  packages/axe-core/lib/core/utils/process-message.js \
  packages/axe-core/lib/core/utils/publish-metadata.js \
  packages/axe-core/lib/core/utils/query-selector-all-filter.js \
  packages/axe-core/lib/core/utils/query-selector-all.js \
  packages/axe-core/lib/core/utils/queue.js \
  packages/axe-core/lib/core/utils/respondable.js \
  packages/axe-core/lib/core/utils/rule-error.js \
  packages/axe-core/lib/core/utils/rule-should-run.js \
  packages/axe-core/lib/core/utils/select.js \
  packages/axe-core/lib/core/utils/selector-cache.js \
  packages/axe-core/lib/core/utils/send-command-to-frame.js \
  packages/axe-core/lib/core/utils/serialize-error.js \
  packages/axe-core/lib/core/utils/set-scroll-state.js \
  packages/axe-core/lib/core/utils/shadow-select-all.js \
  packages/axe-core/lib/core/utils/shadow-select.js \
  packages/axe-core/lib/core/utils/to-array.js \
  packages/axe-core/lib/core/utils/token-list.js \
  packages/axe-core/lib/core/utils/unique-array.js \
  packages/axe-core/lib/core/utils/uuid.js \
  packages/axe-core/lib/core/utils/valid-input-type.js \
  packages/axe-core/lib/core/utils/valid-langs.js

# core/utils/frame-messenger/ (4 files with .ts counterparts)
git rm \
  packages/axe-core/lib/core/utils/frame-messenger/assert-window.js \
  packages/axe-core/lib/core/utils/frame-messenger/channel-store.js \
  packages/axe-core/lib/core/utils/frame-messenger/create-responder.js \
  packages/axe-core/lib/core/utils/frame-messenger/message-id.js

# commons/forms/ (8 files)
git rm \
  packages/axe-core/lib/commons/forms/index.js \
  packages/axe-core/lib/commons/forms/is-aria-combobox.js \
  packages/axe-core/lib/commons/forms/is-aria-listbox.js \
  packages/axe-core/lib/commons/forms/is-aria-range.js \
  packages/axe-core/lib/commons/forms/is-aria-textbox.js \
  packages/axe-core/lib/commons/forms/is-disabled.js \
  packages/axe-core/lib/commons/forms/is-native-select.js \
  packages/axe-core/lib/commons/forms/is-native-textbox.js

# commons/matches/ (13 files)
git rm \
  packages/axe-core/lib/commons/matches/attributes.js \
  packages/axe-core/lib/commons/matches/condition.js \
  packages/axe-core/lib/commons/matches/explicit-role.js \
  packages/axe-core/lib/commons/matches/from-definition.js \
  packages/axe-core/lib/commons/matches/from-function.js \
  packages/axe-core/lib/commons/matches/from-primative.js \
  packages/axe-core/lib/commons/matches/has-accessible-name.js \
  packages/axe-core/lib/commons/matches/implicit-role.js \
  packages/axe-core/lib/commons/matches/index.js \
  packages/axe-core/lib/commons/matches/matches.js \
  packages/axe-core/lib/commons/matches/node-name.js \
  packages/axe-core/lib/commons/matches/properties.js \
  packages/axe-core/lib/commons/matches/semantic-role.js

# commons/math/ (10 files)
git rm \
  packages/axe-core/lib/commons/math/get-bounding-rect.js \
  packages/axe-core/lib/commons/math/get-intersection-rect.js \
  packages/axe-core/lib/commons/math/get-offset.js \
  packages/axe-core/lib/commons/math/get-rect-center.js \
  packages/axe-core/lib/commons/math/has-visual-overlap.js \
  packages/axe-core/lib/commons/math/index.js \
  packages/axe-core/lib/commons/math/is-point-in-rect.js \
  packages/axe-core/lib/commons/math/rect-has-minimum-size.js \
  packages/axe-core/lib/commons/math/rects-overlap.js \
  packages/axe-core/lib/commons/math/split-rects.js

# commons/standards/ (7 files)
git rm \
  packages/axe-core/lib/commons/standards/get-aria-roles-by-type.js \
  packages/axe-core/lib/commons/standards/get-aria-roles-supporting-name-from-content.js \
  packages/axe-core/lib/commons/standards/get-element-spec.js \
  packages/axe-core/lib/commons/standards/get-elements-by-content-type.js \
  packages/axe-core/lib/commons/standards/get-global-aria-attrs.js \
  packages/axe-core/lib/commons/standards/implicit-html-roles.js \
  packages/axe-core/lib/commons/standards/index.js

# commons/table/ (12 files)
git rm \
  packages/axe-core/lib/commons/table/get-all-cells.js \
  packages/axe-core/lib/commons/table/get-cell-position.js \
  packages/axe-core/lib/commons/table/get-headers.js \
  packages/axe-core/lib/commons/table/get-scope.js \
  packages/axe-core/lib/commons/table/index.js \
  packages/axe-core/lib/commons/table/is-column-header.js \
  packages/axe-core/lib/commons/table/is-data-cell.js \
  packages/axe-core/lib/commons/table/is-data-table.js \
  packages/axe-core/lib/commons/table/is-header.js \
  packages/axe-core/lib/commons/table/is-row-header.js \
  packages/axe-core/lib/commons/table/to-grid.js \
  packages/axe-core/lib/commons/table/traverse.js

echo ""
echo "Done! Deleted .js files that had .ts counterparts."
echo ""
echo "Remaining .js file count:"
find packages/axe-core/lib/ -name "*.js" -type f | wc -l
