# Contract Intelligence — API & Schema Compatibility Guard (Phase 81)

Phase 81 answers a narrow, hard question: **does this change alter a public
contract surface in a way a consumer depends on?**

It consumes the Phase 80 change input (working tree, staged, commit, commit
range or an explicit patch) and adds a structural compatibility layer on top of
it. It never re-parses the change, never rewrites source or schema, never fetches
a remote `$ref`, never runs `protoc`/`npm`, never executes source and never
becomes an authority for Memory, Tasks, Sessions, ADRs or artifacts.

```
Phase 80 Change Input
        │
        ▼
Contract Discovery            baseline vs candidate (never mixed)
        │
        ├── OpenAPI (JSON + bounded YAML subset)
        ├── GraphQL SDL
        ├── gRPC / protobuf
        ├── JSON Schema
        ├── exported TS types / interfaces
        ├── package exports
        └── HTTP route / event channel contracts (from the graph)
        │
        ▼
Structural Compatibility Engine   explicit, direction-aware rules
        │
        ▼
Consumer Mapping               graph + registered Fleet scope
        │
        ▼
Evidence Profiles              Scout / Verify / Auditor
        │
        ▼
Contract Guard                 compatible | review_required | incomplete
```

## Supported contract kinds

| Kind | Source | Notes |
| --- | --- | --- |
| `openapi` | `openapi.json`, `openapi.yaml`, `swagger.*` | JSON always; YAML only for a conservative block subset |
| `graphql` | `*.graphql`, `*.gql` | type/interface/input/enum; args are the request side |
| `grpc` | `*.proto` | message fields (name, type, **number**), RPC methods, enums |
| `json_schema` | `*.schema.json`, JSON under `schema/`, `schemas/`, `contracts/`, `apis/` | `properties`/`required`/`$defs` |
| `type` | `*.ts`, `*.tsx`, `.mts`, `.cts` | **only exported** declarations |
| `package_export` | `package.json` | `exports`, `main`, `module`, `types`, `typings` |
| `http` | graph route symbols (`POST /orders`) | whole-route presence |
| `event` | graph event symbols | channel-level; payload only when an explicit schema exists |

## Baseline vs candidate

Baseline content is read with a **read-only** `git show <rev>:<path>`
(`--no-ext-diff --no-textconv`, argument-array invocation, validated revision and
contained path). Candidate content is read from the working tree inside the
project root, refusing sensitive files. The two sides are fingerprinted
separately and are never mixed into one generation.

An added file legitimately has no baseline and a deleted file legitimately has no
candidate. Only an unavailable side that the other side still shows as a live
contract is reported as `BASELINE_CONTRACT_UNAVAILABLE` /
`CANDIDATE_CONTRACT_UNAVAILABLE`.

## Structural compatibility rules

Direction matters. The same field change can be breaking in one direction and
compatible in the other.

**Request side (consumer dictates the shape)**

| Change | Classification | Reason |
| --- | --- | --- |
| accepted field removed | breaking | `CONTRACT_REMOVED` |
| required field added | breaking | `REQUIRED_PARAMETER_ADDED` |
| optional field added | compatible | — |
| type changed | breaking | `PARAMETER_TYPE_CHANGED` |
| optional → required | breaking | `REQUIRED_PARAMETER_ADDED` |
| GraphQL arg nullable → non-null | breaking | `GRAPHQL_NULLABILITY_TIGHTENED` |
| enum value removed | breaking | — |

**Response side (provider dictates the shape)**

| Change | Classification | Reason |
| --- | --- | --- |
| guaranteed field removed | breaking | `RESPONSE_FIELD_REMOVED` / `GRAPHQL_FIELD_REMOVED` |
| field type changed | breaking | `RESPONSE_TYPE_CHANGED` / `PROTO_FIELD_TYPE_CHANGED` |
| field no longer guaranteed | potentially breaking | — |
| GraphQL field non-null → nullable | breaking | `GRAPHQL_NULLABILITY_TIGHTENED` |
| field added | compatible | — |
| enum value removed | potentially breaking | — |

**Contract level**

| Change | Classification | Reason |
| --- | --- | --- |
| contract removed | breaking | `CONTRACT_REMOVED` |
| HTTP method/path changed | old removed + new added | `CONTRACT_REMOVED` |
| exported type attribution changed | breaking | `PUBLIC_TYPE_CHANGED` |
| package export removed | breaking | `EXPORT_REMOVED` |
| RPC method removed | breaking | `RPC_METHOD_REMOVED` |
| protobuf field number changed | breaking | `PROTO_FIELD_NUMBER_CHANGED` |
| event channel removed | breaking | `EVENT_CHANNEL_REMOVED` |
| contract added | compatible | `CONTRACT_ADDED` |

### Structural compatibility is not consumer impact

A structural break is a structural break **even with zero known consumers**. A
public API that removes a required response field is breaking regardless of
whether ToolNet can see a caller. Consumer counts are reported separately and
never downgrade the classification.

### Protobuf honesty

Field **numbers** are contract identity: a renamed-but-renumbered field is
detected as `PROTO_FIELD_NUMBER_CHANGED`. Reserved ranges and extension
semantics are **not** implemented, so this build never claims complete protobuf
compatibility.

### Public surface only

Only exported TypeScript declarations become `type` contracts. Changing a
private interface is not an API break (it may still have local impact through
Phase 80).

## Consumer mapping

Consumers are resolved through the graph and the registered Fleet scope:

| Kind | Edge vocabulary |
| --- | --- |
| `http`, `openapi` | `HTTP_CALLS` |
| `graphql` | `GRAPHQL_CALLS` |
| `grpc` | `RPC_CALLS` |
| `type` | `USES_TYPE`, `IMPLEMENTS`, `CALL_REFERENCE` |
| `package_export` | `IMPORTS` (Fleet identity for the package) |
| `event` | `LISTENS_ON`, `EMITS` |

Reserved protocol vocabulary (for example `CROSS_RPC_CALLS`, which has no
producer) leaves consumer coverage **partial** — never "complete". A package or
event with no local node uses its canonical identity as the Fleet resource
identity; never a URL or a name resemblance.

## Runtime evidence (Phase 79)

Runtime traces may corroborate that a consumer actually used a contract. They are
**additive only**: a runtime observation marks a consumer, but runtime
non-observation never clears a breaking change and never makes a claim safer.

## ADR context (Phase 75)

Relevant accepted ADRs are attached as constraints and produce an
`ADR_CONSTRAINT` reason. An ADR is architecture context, **not** proof that a
dependency exists or does not exist, and this phase never declares an ADR
violation from text similarity.

## Evidence Profiles and claim safety

| Profile | Level | Behaviour |
| --- | --- | --- |
| Scout | provisional | discovery of changed contracts; negative claims blocked |
| Verify | verified | structural compatibility with coverage checks |
| Auditor | audited | bounded exhaustive analysis over the supported scope |

"No breaking contract changes" is an **exhaustive negative claim**. It is only
allowed when the profile is Auditor, the baseline/candidate generations are
fresh and unchanged, coverage is complete, the relevant schemas are supported and
no ref is unresolved. Otherwise the guard returns `incomplete` or
`review_required` with machine-readable reason codes.

## Guard

```json
{
  "decision": "review_required",
  "reasons": ["CONTRACT_REMOVED", "CONSUMER_COVERAGE_PARTIAL"],
  "blockers": [{ "code": "CONTRACT_REMOVED", "detail": "POST /orders: Contract POST /orders was removed." }],
  "safeToMerge": false,
  "safeToDeploy": false
}
```

`compatible` means only "no deterministic incompatible contract change was found
within the verified supported scope". `safeToMerge` and `safeToDeploy` are
**always false**; the guard reports evidence sufficiency, never authorisation.

## Security

- **No remote refs.** An `http://`/`https://` `$ref` is reported
  (`REMOTE_CONTRACT_REF_BLOCKED`) and never fetched.
- **Path containment.** A ref that escapes the document (`../`, absolute) is
  blocked (`CONTRACT_PATH_ESCAPE_BLOCKED`). Baseline/candidate reads refuse
  sensitive files (`.env`, keys, credentials).
- **Cycle safety.** Recursive refs are detected (`CONTRACT_REF_CYCLE`) and
  resolution depth is bounded.
- **Prototype safety.** Parsed documents are treated as hostile; YAML objects are
  built with `Object.create(null)` and `__proto__`/`constructor`/`prototype` keys
  are rejected.
- **No secrets.** Examples/defaults are never persisted, so a credential carried
  in an OpenAPI example cannot appear in a report or a log.
- **Resource limits.** Central bounds (`maxContractFiles`, `maxContracts`,
  `maxSchemaNodes`, `maxRefDepth`, `maxContractChanges`, `maxConsumers`,
  `maxFleetProjects`, `maxSourceReadBytes`); exceeding one yields
  `CONTRACT_ANALYSIS_LIMIT_REACHED` with `complete: false`, never an OOM and
  never a silent truncation presented as completeness.

## Failure modes

| Code | Meaning |
| --- | --- |
| `CONTRACT_COVERAGE_PARTIAL` | relevant capability coverage is not complete |
| `CONTRACT_SCHEMA_UNSUPPORTED` | a contract file uses an unsupported format/construct |
| `BASELINE_CONTRACT_UNAVAILABLE` | a live contract had no readable baseline |
| `CANDIDATE_CONTRACT_UNAVAILABLE` | a live contract had no readable candidate |
| `CONSUMER_COVERAGE_PARTIAL` | reserved vocabulary / stale Fleet / no producer |
| `CONTRACT_GENERATION_CHANGED` | the graph generation moved mid-analysis |
| `CONTRACT_INPUT_CHANGED` | the change input moved mid-analysis |
| `CONTRACT_ANALYSIS_LIMIT_REACHED` | a bound stopped the analysis |
| `REMOTE_CONTRACT_REF_BLOCKED` | a remote `$ref` was refused |
| `CONTRACT_PATH_ESCAPE_BLOCKED` | a `$ref` escaping the project was refused |
| `CONTRACT_REF_CYCLE` | a recursive `$ref` was bounded |
| `FLEET_STALE` / `FLEET_SCOPE_UNBOUNDED` | Fleet not current or empty scope |
| `UNRESOLVED_REFERENCE` / `AMBIGUOUS_ENDPOINT` | cross-service state is not complete |

## Examples

**Safe positive claim**

> Package `@acme/shared` added an optional export `./util`. Structural
> compatibility is `compatible`; no consumer is required to change.

**Blocked negative claim**

> Graph coverage is partial and one schema is unsupported, so "no breaking
> contract changes" is **blocked** (`CONTRACT_COVERAGE_PARTIAL`,
> `CONTRACT_SCHEMA_UNSUPPORTED`). Report the structural deltas instead.

**Audited absence/compatibility claim**

> Within the explicit scope (project + registered Fleet participants A/B/C), all
> relevant contracts parsed, generations fresh, no unresolved refs, and no
> breaking structural change was found → guard `compatible`, claim
> `negativeClaimSafe: true`. This is still not "safe to deploy".

## Surfaces

- `impact_guard` with `mode: "change"` and `includeContracts: true` — the
  Phase 80 report plus a `contractCompatibility` section.
- Runtime: `CodeIntelligenceRuntime.contract()` (local and daemon), with
  content-addressed caching and single-flight for identical analyses. A live
  working tree or index is never cached.
