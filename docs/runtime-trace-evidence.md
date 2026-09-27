# Runtime Trace Evidence — Static/Dynamic Graph Validation

ToolNet already understands static code deeply: AST, deterministic symbol
resolution, `CALLS`, `HTTP_CALLS`, events, cross-service links, the Fleet
overlay, coverage/trust and Evidence Profiles.

What static analysis cannot know is what a process actually did. An interface
call site may resolve statically to `Repository.save` while the runtime executed
`OrderRepository.save`. Phase 79 adds the layer that reconciles the two.

> **Absence of runtime observation is never proof of absence.**

No LLM, no embeddings, no vector database. No source execution, no process
instrumentation, no debugger attach, no packet capture, no eBPF, no external
tracing service and no OpenTelemetry collector requirement.

## The authority boundary

This is the invariant the whole phase is built around:

| Runtime says                       | ToolNet does                                                       |
| ---------------------------------- | ------------------------------------------------------------------ |
| observed A → B                     | attach a `RuntimeObservation`; never rewrite or create a static edge |
| did not observe A → B              | attach nothing; the static edge stays valid, never marked invalid    |
| no trace at all                    | nothing changes; never makes a negative claim safer                  |
| observed a symbol executing        | that symbol is not dead for those observations                       |

Runtime evidence is **derived, observational state**. It is not written into
Memory, the Task WAL, Sessions, ADRs, the Wiki, the Project Manual or a Phase 76
graph artifact, and nothing in this layer can mutate a `CodeGraphStore`.

## Trace sessions

Every payload belongs to a `RuntimeTraceSession`:

```
id, projectId, source, startedAt?, endedAt?, graphGeneration?,
sourceManifestHash?, environment?, importedAt, adapter,
eventCount, acceptedEvents, rejectedEvents, deduplicatedEvents, compatibility
```

The session id is **content-derived** (`rts-<digest>`), so re-importing the same
payload resolves to the same session. It is never a graph identity and is never
used to address symbols, edges or projects.

## Trace events

Four normalized kinds:

- **call** — `caller`/`callee` runtime symbol references, plus a `dispatch` flag.
- **http** — method, canonical path, host/service, optional status code.
- **event_emit** / **event_consume** — provider, channel, producer/consumer,
  optional hashed correlation identity.

### Identity mapping

Runtime symbol references are resolved in a fixed order of evidence:

1. exact ToolNet symbol id
2. unique qualified name
3. unique file/module path + simple name

A bare simple name is **never** matched repository-wide. Two candidates yield
`TRACE_SYMBOL_AMBIGUOUS`; there is no first-match win, no fuzzy matching and no
similarity scoring. An id that exists but belongs to a different project/file is
reported as `RUNTIME_IDENTITY_CONFLICT`.

Service identity is matched by explicit service id or an exact service name /
first host label — never by URL similarity.

## Static validation outcomes

Each observation carries one validation state:

| State                  | Meaning                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `validates_static_edge`| a real static edge corroborates the runtime relation                |
| `dynamic_dispatch`     | `A CALL_REFERENCE B` + runtime `A → Impl` where `Impl` implements `B` |
| `not_in_static_graph`  | runtime-only relation — a diagnostic, never a contradiction         |
| `identity_conflict`    | deterministic identity/evidence inconsistency                       |
| `unresolved`           | not enough evidence to map (unsupported parser, dynamic target, …)   |
| `ambiguous`            | more than one matching static identity                              |

`RUNTIME_RELATION_NOT_IN_STATIC_GRAPH` typically means dynamic dispatch,
reflection, generated code, an unsupported parser or a stale graph. It does
**not** mean the runtime is right and the graph is wrong.

## Not-observed semantics

`NOT_OBSERVED` never becomes `ABSENT`. Specifically:

- 100 executions that do not call `X` do not prove production never calls `X`.
- A static edge that was not observed is **not** marked invalid.
- An edge that was not observed can never be used to declare dead code.
- No trace can never make a negative claim safer.

Runtime evidence is one-directional: it can corroborate a positive finding, and
it can block a "never executed" claim for a symbol a trace proves ran. Runtime
silence is deliberately ignored everywhere else.

## Generation and source compatibility

Runtime evidence is tied to provenance:

| Compatibility       | When                                                    |
| ------------------- | ------------------------------------------------------- |
| `exact`             | trace and graph generation match                        |
| `source-compatible` | no generation, but a source manifest hash is present     |
| `stale`             | generations differ                                       |
| `unknown`           | no usable provenance                                     |

Stale or unknown evidence is never presented as exact validation. There is no
probabilistic score anywhere in Phase 79.

## Aggregation

Observations aggregate by relation identity (project, kind, source, target) and
keep a count, first/last observed timestamps, a session count and a bounded
sample of event ids. `observationCount` is a raw observation count: it never
means "important", "likely" or "the only path".

## Ordering and causality

Timestamp ordering alone never establishes causality. A producer→consumer flow
is asserted only when an emit and a receive share a deterministic correlation
identity (and provider/channel) inside the same import. Correlation values are
hashed, never stored raw.

## Evidence Profile integration

Runtime evidence is additive to Phase 78:

- **Scout** may show runtime-observed relationships quickly.
- **Verify** may use compatible runtime observations as supporting evidence.
- **Auditor** may include runtime evidence, but runtime absence **never** closes
  a static coverage gap.

Request it with `options.includeRuntimeTrace` on `verify_evidence`, or set it on
an evidence request. The bundle gains a `runtime` section
(`requested`, `available`, `compatibility`, `sessions`, `observations`,
`relevant`, `items`, `canEstablishAbsence: false`) plus `runtime_trace`
provenance items.

Runtime evidence never enters `coverage`, `requirements`, `unresolved` or
`claimSafety.negativeClaimSafe`. The only claim it can change is `dead_code`,
which it can only make **harder** to assert (`RUNTIME_SYMBOL_OBSERVED`).

## Adapters

Two adapters ship today; the adapter contract is open:

- `toolnet-json` — deterministic ToolNet trace schema, `version: 1`. An unknown
  version is rejected with `TRACE_SCHEMA_UNSUPPORTED`.
- `otel-json` — exported OTLP span records (`resourceSpans` / `scopeSpans`).

Planned adapters (same contract): Chrome trace, Jaeger export, Zipkin export.

### OpenTelemetry attribute allowlist

Only allowlisted semantic-convention attributes survive. Dropped by design:
request/response headers and bodies, cookies, authorizations, `db.statement`,
`url.query` and every application-specific attribute. URL attributes are
canonicalized, so credentials and query strings never reach the store.

## Privacy

- Secrets (authorization, cookies, passwords, tokens, API keys, client secrets,
  credential-bearing URLs, database URLs and statements) are dropped or redacted
  before anything is persisted, logged or returned.
- Request and response bodies are never stored.
- Correlation ids are hashed.
- Trace status and evidence report file/line/symbol/reason metadata only.

## Security

Trace ingestion is untrusted input:

- no `eval`, no dynamic import, no shell, no URL fetch, no DNS, no process attach;
- `__proto__`, `constructor` and `prototype` keys are dropped and never assigned
  through a plain object literal, so a hostile trace cannot pollute a prototype;
- hard limits on payload bytes, events per import, attributes per event,
  attribute length, nesting depth and session duration;
- a caller-supplied `sessionId` must match `[A-Za-z0-9_-]{1,64}` before it can
  become a storage key;
- imports are staged and atomic: a rejected import changes nothing. Partial
  import is opt-in and always reports a rejected-event count.

## Retention

Bounded by session count, age and stored bytes (see
`RUNTIME_TRACE_LIMITS`). Session records are the source of truth and each keeps
its own observation contributions, so pruning a session subtracts exactly what
it contributed — an aggregate never keeps a dangling count or a stale session
reference. Raw vendor payloads are never retained by default: normalize, then
discard. Pruning never touches the static graph.

## Storage

```
projects/<projectId>/runtime-traces/
  sessions/<sessionId>.json
  observations/index.json     (materialized derivation)
  index/sessions.json         (materialized derivation)
```

Both `observations/index.json` and `index/sessions.json` are recomputed from the
session records, so they can always be rebuilt and can never disagree with them.

## MCP surface

- `ingest_traces` — import an explicit trace payload (`trace` object or bounded
  `json` text). There is deliberately no filesystem-path input.
- `runtime_trace_status` — bounded, read-only trace store status; optional
  `prune` with `dryRun`.
- `analyze_impact` — `includeRuntimeEvidence: true` returns `runtimeObservedPaths`
  **separately** from the static `impacts` list. `staticBlastRadius` keeps the
  full static number and is never reduced to the observed subset.
- `verify_evidence` — runtime evidence through `options.includeRuntimeTrace`.

### TGQL and query results

Runtime observations are deliberately **not** merged into normal graph edges.
TGQL keeps returning static graph facts, so a query result can never silently
include a runtime-only relationship as if it were a static edge. Runtime
evidence is exposed through the read-only evidence projection (the bundle's
`runtime` section, `runtime_trace` evidence items and the impact section above)
rather than as invisible edge properties.

## Daemon and standalone parity

Trace imports run through the shared `CodeIntelligenceRuntime`, so a daemon run
and a standalone run produce semantically identical normalized observations from
the same persisted state. Concurrent identical imports are single-flighted by
the coordinator, and the content-derived session id makes a repeated import a
no-op even without a daemon.

## Failure modes

| Situation                              | Result                                              |
| -------------------------------------- | --------------------------------------------------- |
| Unknown trace schema version           | rejected, `TRACE_SCHEMA_UNSUPPORTED`                 |
| Trace for a different project          | rejected, `TRACE_PROJECT_MISMATCH`                   |
| Two candidates for one runtime symbol  | `TRACE_SYMBOL_AMBIGUOUS`, no mapping                 |
| Runtime relation with no static edge   | `RUNTIME_RELATION_NOT_IN_STATIC_GRAPH` diagnostic    |
| Stale graph generation                 | `TRACE_GENERATION_STALE`, compatibility `stale`      |
| Oversized payload / too many events    | rejected, `TRACE_LIMIT_EXCEEDED`                     |
| Identical payload imported twice       | `alreadyImported`, no count inflation                |
| Symbol proven executed, `dead_code`    | blocked, `RUNTIME_SYMBOL_OBSERVED`                   |
| Runtime not observed                   | nothing changes; never makes a claim safer           |
