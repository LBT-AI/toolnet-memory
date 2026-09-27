# Evidence Profiles — Scout, Verify, Auditor

ToolNet can already find symbols, trace calls, measure coverage and query the
graph. What it could not do is tell an agent **how much proof a claim needs**.

Evidence Profiles (Phase 78) close that gap. An agent states the claim it
intends to make; ToolNet answers `allowed`, `provisional` or `blocked` together
with machine-readable reasons. A partial graph can no longer be silently
presented as exhaustive knowledge.

No LLM, no embeddings and no vector database are involved. The layer is
deterministic and derived: it orchestrates the existing graph, coverage,
cross-service, Fleet and source-verification facilities.

## The three profiles

|                       | Scout         | Verify                     | Auditor               |
| --------------------- | ------------- | -------------------------- | --------------------- |
| Purpose               | discovery     | task-critical verification | bounded exhaustive    |
| Evidence level        | `provisional` | `verified`                 | `audited`             |
| Freshness required    | no            | yes                        | yes                   |
| Coverage required     | no            | yes                        | yes                   |
| Exhaustive pagination | no            | for negative claims        | always                |
| Negative claims       | never safe    | when evidence is safe      | when evidence is safe |
| Exhaustive claims     | blocked       | blocked                    | allowed               |
| Source fallback       | none          | gaps                       | gaps                  |
| Dead code             | provisional   | provisional                | provisional           |

Profile behaviour lives in one registry
(`src/code-intelligence/evidence/profiles.ts`). Nothing else hard-codes it.

## Claims

The caller must state the claim, because correctness must never depend on
parsing prose:

`positive`, `negative`, `absence`, `uniqueness`, `exhaustive`, `impact`,
`dead_code`.

A blocked decision always prints the reason codes. Examples:
`SCOUT_PROVISIONAL_ONLY`, `COVERAGE_PARTIAL`, `UNRESOLVED_REFERENCES`,
`AUDIT_LIMIT_REACHED`, `AUDIT_GENERATION_CHANGED`, `PARSE_GAP_RELEVANT`,
`FLEET_PROJECT_STALE`, `RESERVED_CAPABILITY_NO_PRODUCER`.

## Scope

Evidence scope is explicit and bounded: `project`, `path`, `symbol`, `service`
or `fleet`. A `path`, `symbol` or `service` scope must list its members. A
`fleet` claim must name the registered participants, because "all code
everywhere" is not something ToolNet knows. Auditor never widens a scope to an
organisation.

## Coverage first

Coverage is evaluated **before** a negative claim is decided:

1. resolve the required capabilities for the operation and claim;
2. evaluate the current coverage for each of them;
3. collect bounded evidence;
4. combine result + coverage + unresolved state;
5. decide claim safety.

A positive finding stands on its own — a real `CALLS` edge is a fact even when
coverage is partial — but coverage state is still reported so an impact claim can
be qualified.

Reserved vocabulary (for example `CROSS_RPC_CALLS`) has no producer, so an
absence claim over it is never safe: absence of evidence is not evidence of
absence when nothing can emit the edge at all.

## Pagination and limits

Scout may stop after the first bounded page. Verify and Auditor must consume the
pages their claim needs. Auditor consumes every page within the declared scope.

Auditor means _bounded exhaustive_, never unlimited. Central limits
(`src/code-intelligence/evidence/limits.ts`) bound files, references, rows,
projects, depth and pages. Exceeding a limit yields `complete: false` with
`AUDIT_LIMIT_REACHED` — never a silently truncated "complete" answer.

If the project generation changes mid-audit, the run reports
`AUDIT_GENERATION_CHANGED` and the evidence is not combinable. A caller may pin
the generation it believes it is auditing with `options.expectedGeneration`; a
mismatch blocks the claim with `EVIDENCE_STALE_GENERATION` instead of silently
auditing a newer graph. A stale pagination cursor reports
`EVIDENCE_CURSOR_STALE`.

## Source fallback

When the structural graph has a _recorded_ bounded hole (a parse failure, an
unsupported language, an unresolved reference), Verify/Auditor may run a
deterministic lexical check inside the affected file only.

Fallback:

- reads project-contained source only, and refuses absolute paths and escapes;
- refuses sensitive files (`.env`, keys, credentials) and reports the skip;
- never executes source, never makes network calls, never uses an LLM;
- never claims to have resolved the graph structurally.

A file that cannot be read leaves the gap open. A reference found in a gapped
file is reported as evidence (`SOURCE_REFERENCE_FOUND`) and blocks an absence
claim rather than closing the gap.

## Unresolved references and ambiguity

A relevant unresolved, ambiguous or dynamic reference blocks an exhaustive
claim. Resolved-graph zero callers is not proof when an unresolved member call
could target the subject, when an endpoint target is dynamic, or when a Fleet
participant is stale or missing.

## Dead code

Dead code is never "safe to delete". A participation edge (`HANDLES`,
`LISTENS_ON`, `EMITS`, HTTP/RPC calls, imports, tests, …) means the symbol is not
dead. Even a clean audit only establishes that there are no known incoming
references **within the audited scope**, and the result stays `provisional` with
an explicit limitation.

## Fleet and cross-service

A cross-repo absence claim requires the registered Fleet scope to be explicit,
every participant current, and no relevant unresolved cross-project reference.
A cross-service absence claim also requires the route/client extractor coverage
to be complete and the dynamic-URL/ambiguity state to be clean. Neither claim
ever covers more than ToolNet knows about.

## ADR context

Relevant accepted ADRs are attached to the bundle as **constraints**, never as
proof. An ADR cannot make code evidence true, and removing it does not change
raw graph evidence or claim safety.

## Daemon integration

Evidence runs through the shared `CodeIntelligenceRuntime`. The daemon caches and
single-flights identical audits keyed by project, generation and plan
fingerprint, so ten agents asking the same audit question share one computation.
A different generation, profile or scope never reuses another result. Caches are
bounded.

A read-only ADR/config failure degrades to "no constraint", never to a failed
audit.

## Failure modes

| Situation                              | Result                                     |
| -------------------------------------- | ------------------------------------------ |
| Scout asked for absence                | `provisional`, `negativeClaimSafe: false`  |
| Verify with partial coverage           | blocked, `COVERAGE_PARTIAL`                |
| Auditor with an unclosed parse gap     | blocked, `PARSE_GAP_RELEVANT`              |
| Unresolved/ambiguous/dynamic reference | blocked                                    |
| Fleet participant stale/missing        | blocked                                    |
| Reserved protocol edge                 | blocked, `RESERVED_CAPABILITY_NO_PRODUCER` |
| Audit hits a bound                     | `complete: false`, `AUDIT_LIMIT_REACHED`   |
| Generation changes mid-audit           | `AUDIT_GENERATION_CHANGED`                 |
| Pinned generation no longer matches    | blocked, `EVIDENCE_STALE_GENERATION`       |
| Cursor goes stale                      | `EVIDENCE_CURSOR_STALE`                    |

## Examples

Safe positive claim (Scout):

```
profile: scout, operation: find_callers, claim: positive
scope:   { kind: symbol, symbolIds: ["<id>"] }
→ decision: allowed, evidenceLevel: provisional
```

Blocked negative claim (Scout):

```
profile: scout, claim: absence
→ decision: provisional, negativeClaimSafe: false,
  reasons: ["SCOUT_PROVISIONAL_ONLY"]
```

Audited absence claim:

```
profile: auditor, claim: absence
scope:   { kind: symbol, symbolIds: ["<id>"] }
→ decision: allowed, negativeClaimSafe: true, exhaustiveClaimSafe: true,
  pagination: { complete: true }, unresolved: { relevant: 0 }
```

## MCP surface

- `verify_evidence` — the profile-driven entry point.
- `query_graph` accepts an optional `evidenceProfile` and attaches evidence
  metadata (additive; default behaviour is unchanged).
- `get_graph_schema` reports which capabilities are usable by Scout, Verify and
  Auditor, and what blocks an audit.

## Authority boundary

Evidence bundles are derived state. They are cached in memory only, can be
discarded at any time, and never become an authority for Memory, Tasks, Sessions,
the Task WAL, ADRs, the Wiki or the Project Manual. Running audits leaves those
stores byte-identical.
