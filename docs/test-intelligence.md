# Test Intelligence — Change-to-Test Selection & Verification (Phase 82)

Phase 82 turns a deterministic change (Phase 80) plus an optional contract
analysis (Phase 81) into **which tests are relevant, why, and what an explicit
run proves**.

```
Change / Symbol / Contract
        │
        ▼
Test Relationship Discovery   (TESTS, CALLS, HTTP_CALLS, LISTENS_ON, USES_TYPE, IMPORTS, call paths)
        │
        ▼
Test Selection                (direct / contract / integration / transitive / related / e2e)
        │
        ▼
Explicit Execution            (validated framework adapters only)
        │
        ▼
Result + Coverage Ingestion
        │
        ▼
Verification Evidence  →  Regression Guard
```

Module: `src/code-intelligence/test-intelligence/`

| File | Responsibility |
| --- | --- |
| `types.ts` | canonical `TestDescriptor`, selection/verification/run models, error codes |
| `limits.ts` | every hard bound, resolved so callers may only *narrow* them |
| `frameworks.ts` | central framework registry: path matching, symbol extraction, **safe argv**, result parsing |
| `fingerprint.ts` | deterministic selection and execution fingerprints |
| `discovery.ts` | test file discovery + symbol extraction (reads, never executes) |
| `relationships.ts` | test→target relationships with explicit evidence strength |
| `selection.ts` | categories, reason codes, uncovered entities, deterministic greedy cover |
| `execution.ts` | guarded runner (argv arrays, timeout, cancel, output bounds, redaction) |
| `coverage.ts` | passive coverage-report ingestion (LCOV, coverage.py, Istanbul, Go) |
| `store.ts` | bounded derived run/selection store (never an authority) |
| `report.ts` | selection and verification orchestrators |
| `project-facts.ts` | shared injectable facts surface (MCP + daemon parity) |

## Hard invariant

**TEST PASS ≠ PROOF OF NO REGRESSION.**

- A green selected-test run is **evidence**, never authorisation:
  `safeToMerge` / `safeToDeploy` are always `false`.
- Test success only removes **test-specific** blockers. Coverage, contract and
  static blockers remain.
- A test that is skipped, errored, timed out or stale is never PASS evidence.

## Selection is not execution

Discovery and selection are read-only and never run a test. Execution happens
only through an explicit request that references a selection ToolNet produced.

## Evidence strength (never flattened)

| Relationship | Reason code | Category |
| --- | --- | --- |
| `TESTS` | `EXPLICIT_TESTS_EDGE` | direct |
| `CALLS` | `DIRECT_CALLS_CHANGED_SYMBOL` | direct |
| `HTTP_CALLS` / `RPC_CALLS` / `GRAPHQL_CALLS` / `TRPC_CALLS` | `TESTS_CHANGED_ROUTE` | integration |
| `EMITS` / `LISTENS_ON` | `TESTS_EVENT_CHANNEL` | integration |
| `USES_TYPE` / `IMPLEMENTS` / `CALL_REFERENCE` | `USES_CHANGED_TYPE` | related (contract when a change maps to it) |
| `IMPORTS` | `IMPORTS_CHANGED_MODULE` | related |
| call path (`CALLS`/`CALL_REFERENCE`/`IMPORTS`) | `TRANSITIVE_CALL_PATH` | transitive |
| Fleet declaration | `CROSS_REPO_CONSUMER_TEST` | integration |
| runtime-observed path | `RUNTIME_OBSERVED_PATH_TEST` | unchanged category |

A **filename alone never proves** what a production symbol a test covers.

Each selected test carries its reason code and the semantic path that produced
it. Ordering is a deterministic **tier** order, never a relevance score.

## Minimal set

`selection.minimal` is a deterministic **greedy** cover of the changed entities,
documented as a heuristic — not a mathematically minimal solution.

## Uncovered entities and discovery coverage

Every changed entity without a known test is reported honestly. The reason code
depends on discovery coverage:

- discovery complete → `NO_KNOWN_TEST`
- discovery partial → `DISCOVERY_INCOMPLETE`
- unsupported framework → `UNSUPPORTED_FRAMEWORK`

**"No tests exist" can never come from partial discovery.**

## Fleet and runtime relevance

- Cross-repo tests require a deterministic Fleet declaration. ToolNet never
  scans other repos for files named `*.test.*`.
- Phase 79 runtime observation marks relevance and **adds** evidence. A test is
  never deselected because runtime did not observe it.

## Evidence Profiles

| Profile | Test claim safety |
| --- | --- |
| scout | discovery only; negative/exhaustive claims **blocked** |
| verify | selection + provenance; negative claims blocked unless complete |
| auditor | negative claim allowed only with complete discovery, complete coverage, fresh generation and no truncation |

## Guarded execution

Execution is explicit and bounded:

- **No arbitrary command input.** There is no `command` field anywhere; argv is
  built from the framework adapter as an array.
- No installation, no network fetch, no global package assumption. The
  executable must resolve from the project's own tooling, otherwise
  `TEST_RUNNER_UNAVAILABLE`.
- Working directory is always the project root.
- Every selected test path is validated (`isContainedTestPath`); an escaping or
  absolute path is rejected with `TEST_PATH_ESCAPE`.
- Bounded timeout (`TEST_RUN_TIMEOUT`), cancellation
  (`TEST_RUN_CANCELLED`, process group terminated), bounded output
  (`output.truncated`), and line-by-line secret redaction before anything is
  persisted or reported.
- Bounded concurrency (`maxProcesses`).

Runner failures are distinguished: assertion failure vs runner error vs
environment unavailable vs timeout vs cancel.

## Stale results

A run pins the change fingerprint, the selection and the source generation.
If the change moves mid-run — or the caller pins a different fingerprint — the
result is `TEST_SELECTION_STALE` / `TEST_RESULT_STALE` and can never certify the
newer working tree.

## Coverage reports

Coverage is **passive**: ToolNet ingests a report the caller already produced.
A report with no declared generation is stale; a report from another generation
or change fingerprint is stale. A covered line means "executed in that run",
never "correct".

## Regression Guard integration

Test verification contributes test-specific blockers only:

`CHANGED_ENTITY_WITHOUT_KNOWN_TEST`, `CONTRACT_CHANGE_WITHOUT_KNOWN_TEST`,
`SELECTED_TEST_FAILED`, `SELECTED_TEST_ERROR`, `SELECTED_TEST_TIMEOUT`,
`TEST_RESULT_STALE`, `TEST_SELECTION_INCOMPLETE`, `TEST_RUNNER_UNAVAILABLE`,
`TEST_DISCOVERY_PARTIAL`, `REQUIRED_TEST_SKIPPED`.

## Authority boundary

Test selections and runs live in a separate, bounded, discardable namespace.
They never mutate Memory, Tasks, Sessions, the Task WAL, ADRs, the Phase 76
graph artifact, the Phase 79 runtime traces or the static graph.

## MCP surface

- `select_tests` — read-only change-to-test selection.
- `run_selected_tests` — explicit execution of a selection id (no command input).
- `test_run_status` — bounded read-only run status.
- `impact_guard mode=change includeTests=true` — additive selection inside the
  existing change report.

## Failure modes

| Code | Meaning |
| --- | --- |
| `TEST_SELECTION_NOT_FOUND` | unknown selection id for this project |
| `TEST_ID_INVALID` / `TEST_NOT_IN_SELECTION` | malformed or foreign test id |
| `TEST_PATH_ESCAPE` | a selected path is not project-contained |
| `TEST_RUNNER_UNAVAILABLE` | framework executable not resolvable locally |
| `TEST_RUNNER_ERROR` | the runner could not execute |
| `TEST_RUN_TIMEOUT` / `TEST_RUN_CANCELLED` | bounded by timeout / cancel |
| `TEST_ENVIRONMENT_UNAVAILABLE` | test needs a service ToolNet will not start |

No LLM. No embeddings. No vector database.
