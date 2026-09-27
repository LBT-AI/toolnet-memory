# Change Intelligence — Git-Diff Impact & Regression Guard

Phase 80 turns a code change into deterministic impact evidence and a structured
regression-guard decision.

```
change input -> mapper -> impact expansion -> ADR/runtime context -> guard
```

The change is described by the diff; the structure by the graph. Runtime
observations corroborate and ADRs constrain. No source overrides another.

This is ANALYSIS ONLY. It never mutates the static graph, never executes
repository source or tests, never runs a mutating git command, never publishes an
artifact and never becomes an authority for Memory, Tasks, Sessions or ADRs. No
LLM, no embeddings and no vector database are involved.

## Change input modes

| Mode           | What it describes                          |
| -------------- | ------------------------------------------ |
| `working_tree` | the working tree relative to HEAD (default) |
| `staged`       | the index                                  |
| `commit`       | a single commit                            |
| `commit_range` | `base..head`                               |
| `patch`        | an explicit unified-diff payload           |

Git inspection is read-only. External diff drivers and textconv filters are
disabled (`--no-ext-diff --no-textconv`), arguments are passed as an array (never
a shell string) and revisions are validated so an argument can never be read as a
git option. A patch is parsed only — never applied — and a path that escapes the
project root is rejected with `CHANGE_PATCH_PATH_ESCAPE`. Sensitive files are
never read.

## Change model and fingerprint

The canonical model is `FileChange` (kind, old/new path, binary flag, hunks) with
a bounded `ChangeHunk`. The snapshot id fingerprints the parsed model **including
the changed line content**, so two different edits at the same position never
share an identity. The change fingerprint adds the project, mode, revisions,
baseline/candidate/Fleet generations and the Evidence Profile. Identical input
always produces the same report; no timestamps are involved.

## Semantic change types

`SYMBOL_ADDED`, `SYMBOL_MODIFIED`, `SYMBOL_DELETED`, `SYMBOL_RENAMED`,
`SIGNATURE_CHANGED`, `PARAMETER_CHANGED`, `RETURN_TYPE_CHANGED`,
`VISIBILITY_CHANGED`, `IMPORT_CHANGED`, `DEPENDENCY_CHANGED`, `TYPE_CHANGED`,
`INHERITANCE_CHANGED`, `IMPLEMENTATION_CHANGED`, `ROUTE_ADDED`,
`ROUTE_CHANGED`, `ROUTE_REMOVED`, `EVENT_CHANNEL_CHANGED`, `MANIFEST_CHANGED`,
`CONFIG_CHANGED`, `UNKNOWN_TEXTUAL_CHANGE`.

Changed hunks map to symbols by exact file + line ownership — never a simple-name
guess. Deleted entities are resolved against the **baseline** graph so their
consumers are not lost. A symbol that no longer parses is treated as absent, not
unchanged. A body-only edit is `SYMBOL_MODIFIED`; `SIGNATURE_CHANGED` is emitted
only when a deterministic declaration delta appears in the diff lines. The tool
never invents a semantic change when parser evidence is insufficient.

## Impact expansion

Reverse dependency traversal preserves the semantic path that produced each
impact:

```
changed: OrderRepository.save
path:    OrderRepository.save <- CALLS - OrderService.createOrder
```

Direct and transitive impact are separate, and cross-service / cross-repo impact
are reported distinctly. Cross-repo impact resolves only through exact Fleet
identity (never URL or name resemblance). Runtime observations are reported as a
separate section: they corroborate impact but never shrink the static blast
radius, and runtime non-observation never clears an impact. Tests map through the
deterministic `TESTS` edge — never a filename guess — and a mapped test is
evidence, never a correctness guarantee.

Every impact carries a classification: `direct`, `transitive`, `contract`,
`cross_service`, `cross_repo`, `runtime_observed`, `test_related`,
`adr_constrained`, `unresolved`.

## ADR constraints

Relevant accepted ADRs are attached as **constraints**, never as proof. An ADR
cannot make code evidence true, and removing it does not change raw graph impact.
A change that touches an ADR-declared path or symbol raises `ADR_CONSTRAINT`
(review context), and is never automatically labelled a violation.

## Regression guard

The guard reports whether the evidence is sufficient; it does **not** approve a
merge or a deployment.

```
decision: clear | review_required | incomplete
safeToMerge: false   (always)
safeToDeploy: false  (always)
```

`clear` means only "no blocking issue detected within the verified declared
scope". Reason codes include `COVERAGE_PARTIAL`, `COVERAGE_UNAVAILABLE`,
`GRAPH_STALE`, `FLEET_STALE`, `UNRESOLVED_REFERENCE`, `AMBIGUOUS_ENDPOINT`,
`DELETED_SYMBOL_HAS_CALLERS`, `REMOVED_ROUTE_HAS_CLIENTS`,
`EVENT_CHANNEL_HAS_CONSUMERS`, `ADR_CONSTRAINT`, `AUDIT_LIMIT_REACHED`,
`BINARY_CHANGE_UNANALYZED`, `POST_CHANGE_GRAPH_UNAVAILABLE`,
`CHANGE_ANALYSIS_LIMIT_REACHED`, `CHANGE_INPUT_CHANGED`, `UNMAPPED_CHANGE`,
`UNSUPPORTED_LANGUAGE_CHANGE`, `FLEET_SCOPE_UNBOUNDED`.

An empty impact list is never treated as a safe change when coverage is partial.
Negative and exhaustive claims remain governed by the Phase 78 Evidence Profile
claim-safety contract: Scout can never support them, Verify needs complete,
fresh coverage, and only Auditor can support a bounded exhaustive claim.

## Deterministic change coverage

```
{
  "changedFiles": 8,  "mappedFiles": 8,
  "changedHunks": 21,
  "changedSymbols": 14, "mappedSymbols": 13,
  "binaryFiles": 0,
  "unmapped": [ { "kind": "UNMAPPED_HUNK", "path": "src/x.ts" } ],
  "truncated": false
}
```

Mapping gaps (`BINARY_FILE`, `UNSUPPORTED_LANGUAGE`, `PARSE_FAILURE`,
`UNMAPPED_HUNK`, `GENERATED_CODE`, `SOURCE_GENERATION_MISMATCH`,
`SENSITIVE_FILE`, `EXCLUDED_PATH`) affect guard completeness. There is no
"100%" when binaries or unsupported files remain.

## Limits

Central limits (`src/code-intelligence/change/limits.ts`) bound changed files,
hunks, symbols, impact depth, impact nodes, impact edges, Fleet participants,
patch bytes and source reads. Exceeding a limit yields
`CHANGE_ANALYSIS_LIMIT_REACHED` with `complete: false` — never a silently
truncated "complete" answer, and never an OOM.

If the working tree or index moves during analysis the run reports
`CHANGE_INPUT_CHANGED` and pins the snapshot it actually analysed; two
snapshots are never combined.

## Runtime, daemon and standalone

Change analysis runs through the shared `CodeIntelligenceRuntime`. The daemon
single-flights concurrent identical analyses into one computation and caches only
content-addressed inputs (patch, commit, range) keyed by project, generation and
input digest — a live working tree or index is never cached, and a different
generation never reuses a result. Standalone and daemon analyses are semantically
identical, and change analysis works with no daemon present.

## MCP surface

`impact_guard` gains `mode: "change"` (additive; the legacy `git_diff` and `file`
modes are unchanged), with `changeMode`, `base`, `head`, `patch`,
`evidenceProfile`, `claim`, `includeCrossService`, `includeFleet` and
`includeRuntimeEvidence`. The response is the bounded structured report — never a
raw diff and never a giant patch.

Before modifying high-impact code, run the change analysis; after significant
edits, re-run it against the current diff. Before claiming "nothing else is
affected", use `evidenceProfile: "auditor"` and a bounded scope. Never equate an
empty impact list with a safe change when coverage is partial.

## Failure modes

| Situation                         | Result                                              |
| --------------------------------- | --------------------------------------------------- |
| Deleted symbol still called       | `review_required`, `DELETED_SYMBOL_HAS_CALLERS`     |
| Removed route still called        | `review_required`, `REMOVED_ROUTE_HAS_CLIENTS`      |
| Event channel still consumed      | `review_required`, `EVENT_CHANNEL_HAS_CONSUMERS`    |
| Binary change                     | `incomplete`, `BINARY_CHANGE_UNANALYZED`            |
| No parser for a changed file      | `UNSUPPORTED_LANGUAGE_CHANGE`                       |
| Partial call-graph coverage       | `review_required`, `COVERAGE_PARTIAL`               |
| Generation moved mid-analysis     | `incomplete`, `CHANGE_INPUT_CHANGED`                |
| Diff exceeds a bound              | `incomplete`, `CHANGE_ANALYSIS_LIMIT_REACHED`       |
| Malicious revision / patch path   | rejected, `CHANGE_REVISION_INVALID` / `CHANGE_PATCH_PATH_ESCAPE` |

## Failure of the guard is never a failure of the repository

The guard is evidence, not policy. Human/CI policy makes the final merge or
deploy decision; ToolNet only reports what the evidence does and does not
support.
