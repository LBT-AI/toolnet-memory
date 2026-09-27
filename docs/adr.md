# Architecture Decision Records (ADR)

Phase 75 adds persistent engineering knowledge: the durable **why** behind the
code. An ADR is structured, project-scoped, auditable and portable — not chat
history, not a raw transcript, not task state, and not an AI-inferred summary.

## Authority

```text
projects/<projectId>/knowledge/adr/state.v1.json   authority (records + history)
projects/<projectId>/knowledge/adr/markdown/*.md   deterministic projection
```

The structured store is the authority. Markdown is a projection that can always
be regenerated from it, so it is not part of the backup authority set. The
destination is server-controlled: a record title is sanitised into a bounded
filename and can never redirect or escape the projection prefix.

## Record model

| Field                          | Notes                                                              |
| ------------------------------ | ------------------------------------------------------------------ |
| `id`                           | `<projectId>:ADR-0001` — canonical key                             |
| `humanId`                      | `ADR-0001`, project-scoped, never reused                           |
| `number`                       | monotonic, never reused (superseded numbers stay retired)          |
| `status`                       | `proposed` / `accepted` / `deprecated` / `superseded` / `rejected` |
| `title`, `context`, `decision` | the substance                                                      |
| `consequences`                 | positive / negative / neutral lists                                |
| `alternatives`                 | title, description, rejectedBecause                                |
| `affectedPaths`                | project-relative globs (`src/fleet/**`)                            |
| `affectedSymbols`              | exact symbol ids or qualified names                                |
| `tags`, `references`           | normalised, allowlisted                                            |
| `supersedes`, `supersededBy`   | deterministic supersession links                                   |
| `revision`                     | increments on every mutation                                       |
| `createdAt`, `updatedAt`       | timestamps (never used for concurrency control)                    |
| `provenance`                   | `manual` / `migration` / `import` (+ optional actor)               |

`id`, `projectId`, `number`, `humanId`, `createdAt` and the record schema are
immutable.

## Status lifecycle

```text
proposed ──► accepted ──► deprecated ──► (superseded)
    │            │
    ├──► rejected└──► (superseded)

superseded / rejected are terminal
```

`superseded` is reachable only through the atomic `supersede` operation.
There is no `rejected -> accepted` path. Nothing is auto-accepted: a `proposed`
record stays proposed until an explicit, audited mutation.

## Operations — `manage_adr`

`manage_adr` is the single typed MCP tool. Every operation is project-scoped and
bounded.

| Action          | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `create`        | allocate the next number; `status` defaults to `proposed`            |
| `get`           | one record by `ADR-0001`, canonical id or number                     |
| `list`          | filter by status/tag with limit/offset; current authority by default |
| `search`        | local lexical (BM25-style) ranking                                   |
| `update`        | replace the supplied sections                                        |
| `set_sections`  | byte-preserving partial update — untouched sections keep their value |
| `change_status` | explicit lifecycle transition                                        |
| `supersede`     | atomic old → replacement link                                        |
| `history`       | append-only audit events for one ADR                                 |
| `chain`         | bounded supersession chain in both directions                        |     | `export` | deterministic Markdown for one id; without an id, persist every projection and return keys |
| `import`        | explicit import of canonical ADR Markdown                            |

`list` and `search` return current authority (`proposed`, `accepted`,
`deprecated`) unless a status filter or `includeHistorical` is given, so a
superseded record is never presented as current guidance.

Internally the same questions are served by the read-only
`ArchitectureDecisionQuery` facade (`get`, `list`, `search`, `affectedByPath`,
`affectedBySymbol`, `supersessionChain`), which never exposes the mutation
surface. The structured store (`AdrStore`) stays the authority.

### Errors

Deterministic codes, never a stack trace:

`ADR_NOT_FOUND`, `ADR_INVALID`, `ADR_CONFLICT`, `ADR_INVALID_TRANSITION`,
`ADR_SUPERSESSION_CYCLE`, `ADR_PATH_ESCAPE`, `ADR_SECRET_DETECTED`,
`ADR_UNSUPPORTED_FORMAT`.

## Revisions, conflicts and idempotency

Every mutation increments `revision`. Callers may pass `expectedRevision`:

```json
{
  "action": "set_sections",
  "id": "ADR-0004",
  "expectedRevision": 7,
  "sections": { "context": "..." }
}
```

If the current revision is 8 the call fails with `ADR_CONFLICT` — there is no
last-write-wins and no timestamp merge.

Retrying the exact same intent is idempotent: the operation returns success with
no new revision and no duplicate history event, even when the caller re-sends
the now-stale `expectedRevision`. Identical `create` payloads return the original
record rather than allocating a second number.

## History

Mutations append an audit event (`created`, `updated`, `sections_updated`,
`status_changed`, `superseded`, `imported`) with the before/after revision, the
changed field names and a deterministic intent hash. History is never
overwritten and never contains credential values.

## Search and relevance

- **Search** ranks title, tags, decision, context, alternatives and affected
  paths locally. No embeddings, no vector database, no external model.
- **Path relevance** uses a bounded glob subset: exact paths, directory prefixes
  (`src/fleet/**`) and `*`/`**` wildcards compiled by the resolver into a
  regex. Caller-supplied regular expressions are never executed.
- **Symbol relevance** requires an exact symbol id or qualified-name match.
  Simple-name guessing is not implemented.

## Code linking

`affectedPaths` and `affectedSymbols` are the only code links, and they are
deterministic. Symbol links are reported as `resolved`/`unresolved` against the
indexed graph; an unresolved reference is kept explicitly rather than guessed.
ADR relationships (`supersedes`) are knowledge relationships and never become
authoritative code graph edges.

## Agent context

Before editing a file or analysing a symbol, the relevant accepted ADRs are
available:

- `project_context` with `filePaths`/`symbols` → `architectureDecisions`
- `analyze_impact` → `relevantADRs` (human ids)

Both are additive and bounded. Superseded, deprecated, rejected and unrelated
records are not injected. ADRs are engineering context: they do not override the
current user instruction, current code reality or security policy, and
`analyze_impact` calculations are unchanged.

## Backup and recovery

`knowledge/adr/state.v1.json` is part of the snapshot authority set, so snapshot
create/restore preserves record bodies, revisions, history and supersession
links. The Markdown projection is rebuildable and therefore not backed up.

## Project isolation

ADRs are project-scoped. Two projects may each own an `ADR-0001` with different
identity and content, and a scoped storage provider refuses cross-project
access outright. ADR identity never depends on a machine path.

## Security

- Affected paths must be project-relative: absolute paths, `~`, drive letters,
  parent traversal and control characters are rejected (`ADR_PATH_ESCAPE`).
- Credential material is rejected (`ADR_SECRET_DETECTED`): structured
  references are scanned with the full pattern set, and every text field is
  checked against unambiguous key formats (cloud/API tokens, JWTs, private key
  blocks, credential-bearing URLs). Detected values are never stored or echoed.
- Markdown import accepts canonical ADR Markdown only
  (`ADR_UNSUPPORTED_FORMAT` otherwise). Fields are never guessed by a model, and
  the export destination is fixed by the server.
- No LLM, no embeddings, no vector database, no shell, no `eval`, and no source
  execution.

## Importing existing ADRs

Migration is explicit and operator-initiated. `manage_adr` with
`action: "import"` accepts canonical Markdown:

```markdown
# ADR-0007: Imported decision

Status: Accepted

## Context

...

## Decision

...

## Affected Areas

- `src/imported/**`
```

Import uses the document's number when it is free and fails with `ADR_CONFLICT`
when it is already taken, so existing numbering is never silently renumbered.
README files and arbitrary docs are never auto-converted into decisions.

## Certification

```bash
npm run phase75:certify
```

PASS marker: `PHASE75_ARCHITECTURE_DECISIONS=PASS`. The certification covers the
CRUD contract, revision conflicts, lifecycle, supersession and cycle prevention,
byte-preserving section updates, idempotency, search, path/symbol relevance,
project isolation, history, backup/recovery, context and impact integration,
security, determinism, MCP registration and the packaged runtime.

## Non-goals

No automatic ADR creation or acceptance, no LLM-authored decisions, no
inferring fields from prose, no embeddings/vector database, no graph query
language integration in this phase, and no shared cross-repo knowledge artifact.
