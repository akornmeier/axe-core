# Propellr: parity, benchmark and reporting acceptance

September 11, 2026. Requirements for the greenfield project, not executed results
or an implementation plan. The [product brief](propellr-product-brief.md) governs
scope; the [reference policy](axe-core-reference.md) pins canonical axe-core.

## 1. Evaluation matrix

Primary baseline: axe-core `v4.13.0` at
`1cc54b900413660610180d631feb73c9e74f4dc9`. Pinned `develop` remains secondary.

| Dimension         | Required treatment                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser engines   | Chromium, Firefox and WebKit. Compare both implementations within the same engine/version, not one browser against another.                                                                |
| Host              | Record exact Node, browser, OS, hardware and automation versions. Engine coverage does not imply certification of every browser product, mobile device or assistive technology.            |
| Rule catalog      | Inventory every baseline rule, including best-practice and opt-in rules; track experimental rules in a separate lane. Map Propellr rules to canonical behavior even if identifiers differ. |
| Configuration     | Cover equivalent default activation and explicit rule/option selections. Record rules, options, scope and capabilities for each run.                                                       |
| Page state        | Same fixture revision, viewport, device scale, fonts, resources and readiness conditions. No engine runs on a page mutated by the other engine.                                            |
| Capability limits | Record prerequisites and unavailable regions. Unsupported cases are explicit gaps, not passing tests or silent exclusions.                                                                 |

Exact version pins and supported product/host versions are selected before the
first evaluation. Do not inherit the old checkout's Node floor or require a
browser-specific API for baseline coverage without an explicit support decision.

### Fixture families

| Family                 | Representative cases                                                                                                  | What must be demonstrated                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Standard DOM           | Names, roles, states, forms, links, images, headings, landmarks, tables, language and document-wide relationships     | Positive, negative and inapplicable outcomes; correct affected targets and scope.                                                  |
| Style and layout       | Contrast, visibility, clipping, text spacing, target geometry, zoom, resource/font readiness                          | Real rendered behavior, boundary cases and appropriate incomplete outcomes when evidence is insufficient.                          |
| Shadow DOM             | Nested open roots, slots, composed relationships and repeated components                                              | Correct cross-root analysis and unambiguous target identity. Closed/inaccessible roots must not be represented as inspected.       |
| Frames                 | Same-origin, cross-origin and nested frames; navigation, missing injection and blocked access                         | Correct frame-wide aggregation, target paths and explicit partial/unavailable coverage.                                            |
| Dynamic applications   | Insert/remove/reorder nodes; attributes, ancestor/sibling changes, styles/themes, resize, focus and delayed resources | Correct findings at each scan epoch, invalidation and resolution without stale state.                                              |
| Incomplete/error paths | Unsupported evidence, inaccessible content, evaluator exceptions, cancellation and timeout                            | Distinguish incomplete accessibility evaluation from operational failure. Neither can become a pass or an empty successful report. |

This matrix is not a claim that one generic fixture covers an entire family.
The inventory must connect each rule to reviewed cases and applicable browsers.
Include positive/negative controls, rule-option boundaries and incomplete cases
where applicable. Document why a case is inapplicable rather than inventing an
artificial pass/fail example. Preserve fixture provenance and licensing.

## 2. Parity gate

- Fail inventory checks for unknown/unmapped rules, missing fixtures, empty
  expected suites or missing results. Report active, experimental, unsupported
  and not-yet-implemented coverage separately.
- Compare rule-level outcomes and occurrence-level targets, accessibility impact
  and relevant evidence. Preserve document, frame and shadow-root scope.
- Normalize representation only: fixture target identities, API shape, ordering
  and documented nondeterminism such as timestamps. Do not normalize away a
  violation, occurrence, incomplete result or semantic evidence difference.
  Message wording and raw selector syntax need not be identical.
- Compare raw occurrences **before deduplication or enterprise gate policy**.
  Grouped counts alone cannot demonstrate accessibility parity.
- Investigate every mismatch. Record reproduction, both outputs, classification
  and disposition: Propellr defect, reference defect, intentional improvement or
  unsupported scope. Unresolved mismatches block a parity claim for that scope.
- Improvements require independently reviewed expectations and regression cases,
  not automatically updated goldens. Upstream bugs must not be copied merely to
  make a comparison green.

Full parity requires accounting for the complete agreed baseline catalog and
matrix. An intermediate vertical slice may claim only its named coverage.
Experimental comparisons remain visible but separate from stable-rule claims.
Exceeding automated coverage is not proof of complete WCAG conformance.

## 3. Realtime correctness gate

For each deterministic mutation sequence, compare Propellr's incremental result
with a fresh Propellr full scan and a fresh canonical full scan at the same settled
page state. Include introduced, persistent and resolved findings, unrelated edits,
changes affecting other subtrees, frame navigation and policy/option changes.

Unknown dependencies or unsupported incremental changes require a full scan or
an explicit limitation. A cancelled or stale epoch cannot overwrite a newer
result. A missing target/rule in an incomplete or narrower scan does not prove
resolution. Apply the same completeness rules to reporting and quality gates.

## 4. Equivalent-work benchmark protocol

Use the parity fixture families plus representative pages at recorded DOM,
frame/shadow, style and finding densities. Performance fixtures must pass their
correctness checks before their timings can support a speed claim.

| Lane             | Comparison                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cold full scan   | Fresh contexts for both engines; report load/initialization and scan costs separately and together.                                                                                                     |
| Warm full scan   | Repeated full scans at equivalent coverage and state. Document retained caches and their memory cost.                                                                                                   |
| Realtime recheck | Propellr incremental update versus canonical full rescan of the same changed state, with full result equivalence verified. Label this comparison explicitly, not as two incremental engines.            |
| Reporting        | Measure serialization, deduplication and each selected adapter separately from scanning and as part of end-to-end delivery. No unsupported claim that canonical provides equivalent reporting features. |
| Added coverage   | Measure Propellr-only checks separately; do not mix them into the baseline-coverage speed ratio.                                                                                                        |

Protocol requirements:

- Pin artifacts and fixture hashes. Use isolated equivalent contexts and alternate
  or randomize execution order. Control competing workload and record conditions.
- Define cold/warm setup, warm-up, measured trial counts, stopping rules and any
  exclusion rules before collecting comparative results. Retain failures/outliers
  with reasons; do not report only the fastest run.
- Report sample counts, latency distributions and uncertainty, CPU and memory
  using comparable collection methods within each browser. Mark unavailable
  metrics unavailable, not zero. Do not pool unlike browsers/hosts into one claim.
- Include extraction, scheduling, invalidation and transfer costs wherever used.
  Report time to a complete usable result, not just evaluator execution time.
- Publish raw measurements, environment, artifact IDs, reproduction command and
  correctness results alongside ratios. Benchmark wins never waive parity gaps.

Add long-lived session workloads: repeated scans, playbook checkpoints, idle
observation and reconnects. Give canonical axe-core equivalent browser/context
reuse; do not manufacture a speedup by restarting only the reference browser.
Measure host/transport/playbook overhead separately and end to end, including
bounded cache/event retention and memory growth over time.

Numeric speedup targets, memory budgets and statistical precision requirements
remain open until baseline measurements establish realistic values. No target
or performance result is asserted by this document.

## 5. Reporting, deduplication and gate acceptance cases

| Case                                       | Required result                                                                                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repeated issue across targets/pages/frames | Group only with supported identity evidence; retain every occurrence and its scoped target/evidence. Expose unique-issue and occurrence counts.                                    |
| Similar-looking but unrelated findings     | Keep separate when identity is uncertain. Shared ancestry, wording or visual similarity alone does not establish a shared cause.                                                   |
| Unchanged finding across scans/builds      | Preserve issue continuity despite harmless representation changes; retain occurrence history.                                                                                      |
| New, resolved and recurring findings       | Correct lifecycle under equivalent rule/scope coverage. Recurrence links to prior history. Missing or failed coverage cannot create a false resolution.                            |
| Rule, policy or identity-algorithm changes | Record versions and comparison compatibility. Do not silently reinterpret history as issue resolution.                                                                             |
| Exceptions and quality gates               | Apply owner/expiry and configured unique/occurrence thresholds reproducibly. Keep raw accessibility outcomes visible even when policy waives or downgrades enforcement.            |
| Report adapters                            | Preserve declared semantics or explicitly disclose unsupported fields. Operational errors and incomplete scans cannot turn into successful quality-gate output through conversion. |
| Agent consumers                            | Versioned, machine-readable findings, scope/completeness, evidence, identity and diagnostics without relying on UI text or engine internals.                                       |

Initial enterprise destinations and formats still need prioritization. SARIF,
JUnit and OpenTelemetry remain candidates, not interchangeable representations.
Select adapters against real enterprise workflows before implementation.

## 6. Stateful session and playbook acceptance

Stateful sessions, pre-built accessibility playbooks and enterprise-first
operation are agreed product direction. Required cases:

| Case                                   | Required result                                                                                                                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client disconnect/reconnect            | Session continues under its lifecycle policy. Reconnect exposes actual operations/results; no automatic replay of browser actions.                                                                                         |
| Host/browser loss                      | Report lost or uncertain operation state. Do not invent a successful checkpoint or claim live browser recovery without supported persistence.                                                                              |
| Attach/end lifecycle                   | Distinguish owned and borrowed resources. Ending a session releases owned state without unexpectedly closing a customer's browser.                                                                                         |
| Concurrent operations and page changes | Coordinate conflicting actions and scan epochs; never commit stale or mixed-state results as current.                                                                                                                      |
| Playbook prerequisites/checkpoints     | Record playbook version, inputs with secrets redacted, step identity and observed state. Failed setup or a skipped checkpoint remains an explicit journey gap, not accessibility success.                                  |
| Mutation, retries and cancellation     | Enforce origin/action permissions. Never blindly retry uncertain side effects; distinguish cancellation request, confirmed termination and incomplete cleanup.                                                             |
| Tenant/session isolation               | No cross-session leakage of credentials, facts, findings or events. Unauthorized control/inspection is rejected and auditable.                                                                                             |
| Events and retention                   | Correlate session/operation/sequence identities; signal replay gaps. Bound memory, node references and retained evidence; apply configured retention/redaction.                                                            |
| Enterprise deployment                  | Operate against authorized customer browsers/private infrastructure without a hosted Propellr account. The host enforces secrets, access and network policy; remote control cannot default to an unauthenticated listener. |

Playbooks must prove interaction checkpoints and associated scans, not imply that
an automated journey establishes complete accessibility or safe execution on
arbitrary websites. First templates need explicitly configured test targets.

## Next decisions

Review the [architecture boundaries](propellr-architecture-boundaries.md) and
[typed public contract prototype](propellr-public-contract.md) against these
requirements. Detailed boundaries and method/schema shapes remain proposals, not
implemented capabilities. Before benchmarking, pin the execution environment and measurement
protocol. Select initial enterprise reporting destinations and define
identity/matching policy before implementing deduplication.

No new workspace, runner, runtime code, fixture corpus or benchmark execution is
created by this specification. Inherited migration CI is not its validation.
