# Portable Code Intelligence Artifacts

Phase 76 — Shared Graph Artifact / Portable Code Intelligence Cache.

An artifact lets a machine that has already indexed a repository hand its
**derived** code-intelligence state to another machine, so the second machine
does not have to re-parse the repository. See the Phase 76 section of
[`docs/architecture.md`](./architecture.md) for the design invariants.

## The authority boundary

An artifact is **derived state**. It is never an authority for:

- long-term memory,
- tasks and the task WAL,
- session state,
- Architecture Decision Records,
- the Wiki or the Project Manual,
- source code.

Hydration can only ever write the fixed component keys declared in the
component table below. It cannot create, overwrite, delete or supersede an ADR,
and it cannot touch memory, task or session state.

## What an artifact contains

| Component       | Kind     | Meaning                                         |
| --------------- | -------- | ----------------------------------------------- |
| `graph`         | required | Semantic graph snapshot (symbols + typed edges) |
| `code-manifest` | required | Source freshness baseline (per-file hashes)     |
| `coverage`      | required | Graph coverage / capability trust snapshot      |
| `resolution`    | required | Deterministic symbol resolution snapshot        |
| `cross-service` | optional | Cross-service protocol link snapshot            |
| `fleet-export`  | optional | Sanitized per-project Fleet export view         |
| `architecture`  | optional | Derived architecture summary                    |
| `analysis`      | optional | Derived graph analysis summary                  |
| `visualization` | optional | Derived visualization dataset                   |

Deliberately **not** shipped:

| Component           | Why                                                            |
| ------------------- | -------------------------------------------------------------- |
| `code-search-cache` | Local SQLite FTS5/BM25 index with no portable on-disk artifact |

The search cache is rebuilt locally from the hydrated graph. Its absence never
makes an artifact unusable, and it is reported in
`manifest.nonPortableComponents`.

No source file **bodies** are included. Source filenames and symbols are, because
the graph is meaningless without them.

## Container format

```
magic         4 bytes   "TNA1"
version       1 byte    container layout version
headerLength  4 bytes   uint32 little-endian
header        N bytes   canonical UTF-8 JSON component index
payload       ...       component bytes, in declared order
```

The whole byte sequence is gzip-compressed with Node's built-in `node:zlib`. No
native compression dependency is required, and streaming means neither
compression nor decompression ever materializes a whole archive in memory.

The container carries **no paths**. Components are identified by name only and
validated against the fixed component table, so `../..`, absolute paths, symlink
entries and drive escapes are structurally impossible: there is no extraction
target derived from archive bytes at all. Reading an artifact returns verified
component bytes; it never writes to a caller-supplied path.

## Storage layout

Project-scoped, through the normal `ProjectScopedStorageProvider`:

```text
projects/<projectId>/graph/artifacts/
  current.json
  generations/<generation>/
    manifest.json
    artifact.tgz
    artifact.sha256
  local-status.json        # machine-local operation journal, never shipped
```

The published generations are immutable. `current.json` is a small pointer
(generation + manifest hash + artifact hash) and is always the **last** write of
a publish.

## Generation identity

```
generation = "gen-" + sha256({
  projectIdentity, sourceManifestHash,
  parser, resolver, graphSemantics, querySchema, artifactSchema
})[0..32]
```

`projectIdentity` is the canonical, credential-free project identity (normalized
git remote, else project name). It is never a machine path, hostname or package
folder, so two clones of the same repository derive the same identity.

No timestamp and no random UUID is involved. The archive header deliberately
carries no timestamp either, so publishing the same generation twice is a no-op
instead of a byte conflict.

## Compatibility

Hydration checks, in order, and reports a specific reason code for each failure:

| Check                       | Reason code                        |
| --------------------------- | ---------------------------------- |
| artifact schema version     | `ARTIFACT_SCHEMA_UNSUPPORTED`      |
| container version           | `ARTIFACT_CONTAINER_UNSUPPORTED`   |
| project id                  | `ARTIFACT_PROJECT_MISMATCH`        |
| canonical project identity  | `ARTIFACT_IDENTITY_MISMATCH`       |
| graph semantics fingerprint | `SEMANTIC_SCHEMA_MISMATCH`         |
| query schema fingerprint    | `QUERY_SCHEMA_MISMATCH`            |
| parser fingerprint          | `PARSER_FINGERPRINT_MISMATCH`      |
| resolver fingerprint        | `RESOLVER_FINGERPRINT_MISMATCH`    |
| local source manifest       | `ARTIFACT_SOURCE_MISMATCH`         |
| archive hash                | `ARTIFACT_HASH_MISMATCH`           |
| per-component hash          | `ARTIFACT_COMPONENT_HASH_MISMATCH` |
| graph semantic validation   | `ARTIFACT_GRAPH_INVALID`           |

There is no partial-compatibility path. When any axis disagrees, the artifact is
`rebuild-required` and the caller falls back to a normal local index.

## Source validation

Adoption requires an **exact** source manifest match. The check is hash-only:

```text
scan source → hash + manifest → compare with artifact manifest
```

The parser is never invoked to validate an artifact, and no parse happens before
it is known to be necessary. Callers that just indexed should pass the manifest
they already have (`sourceManifest`), which removes the scan as well.

If the local source has moved on, the artifact is refused with
`ARTIFACT_SOURCE_MISMATCH`. A newer local state is never replaced by an older
artifact, and the existing incremental/full index path runs instead.

## Publish, pull and atomicity

Publish:

1. collect components (a missing **required** component aborts the build),
2. validate the graph semantically — a generation that would fail adoption can
   never be published,
3. stream the archive to local staging,
4. verify the archive reads back and self-verifies,
5. upload the immutable generation,
6. re-read and re-verify it,
7. update the current pointer last,
8. apply bounded retention.

Pull:

1. resolve the current pointer (or an explicit generation),
2. verify the manifest,
3. check compatibility,
4. check the source manifest,
5. download to staging and verify the outer hash,
6. decode the container and verify every component hash,
7. validate the graph semantically,
8. **only then** write components to storage.

Because every failure mode happens before step 8, a failed hydration leaves the
previous generation current and queryable. Component writes are ordered so the
`code-manifest` freshness baseline lands **last**: a partial storage failure
leaves the old baseline in place, so the half-written generation is reported
stale instead of trusted.

`dryRun` performs the whole verification and stops before step 8.

## Archive hardening

| Threat                    | Guard                                                           |
| ------------------------- | --------------------------------------------------------------- |
| path traversal / symlinks | component names validated against the fixed table; no paths     |
| duplicate components      | rejected (`ARTIFACT_COMPONENT_INVALID`)                         |
| decompression bomb        | declared-size, extracted-byte budget and expansion-ratio checks |
| oversized component       | `maxComponentBytes`, checked before payload is read             |
| oversized archive         | `maxArtifactBytes`, checked before the file is opened           |
| corrupted / truncated     | SHA-256 on the archive and on every component                   |
| generation overwrite      | `ARTIFACT_GENERATION_CONFLICT` on differing bytes               |

All limits are centralized in `src/code-intelligence/artifact/limits.ts`.

## Retention and GC

`applyArtifactRetention(store, { keep })` keeps the current generation plus the
`keep` most recent previous generations. The current generation is always
protected and does **not** consume a `keep` slot. `dryRun` reports without
deleting.

Ordering uses each generation's recorded `createdAt`, because a generation id is
a content hash with no inherent order. Timestamps are used only for retention
ordering — never for identity.

The artifact namespace is excluded from Phase 67 disaster-recovery backups: the
cache is derived and fully rebuildable, so it must not inflate the authority
backup. Retention owns it instead.

## Integration

- **Coverage.** Hydration does not assert trust. The coverage snapshot travels
  and is loaded, and `GraphCoverageEvaluator` re-checks freshness against the
  local source before any negative claim is allowed.
- **Query.** Query generation rules are unchanged: hydrating establishes a graph
  generation, and a cursor from a previous generation still fails with
  `CURSOR_STALE`.
- **Fleet.** A pin that no longer matches a project's export is still reported
  stale by the Phase 73 contract. Hydration re-pins the registry to the
  **export's** generation — exactly what a normal index pass records — so no
  fabricated staleness is introduced and no old pin is silently reused.
- **Fleet artifacts.** There is deliberately no single artifact containing all
  project graphs. Fleet state remains a derived overlay.

## MCP surface

`manage_graph_artifact` with actions:

| Action    | Effect                                                                |
| --------- | --------------------------------------------------------------------- |
| `status`  | local vs published generation, compatibility, freshness, components   |
| `publish` | build and upload the current derived graph as an immutable generation |
| `pull`    | verify and hydrate the published generation into this machine         |
| `verify`  | verify the published generation without writing anything              |
| `list`    | published generations with bounded metadata                           |
| `prune`   | apply bounded retention (supports `dryRun`)                           |

There is no arbitrary destination path parameter: staging always lives inside
`<projectRoot>/.toolnet/cache/artifacts/staging`.

## What the agent must not do

- Do not describe an artifact as memory, task or knowledge authority.
- Do not treat a failed pull as something to retry until it "forces" adoption;
  run a normal local index instead.
- Do not treat hydration as making coverage claims safe. The usual
  negative-claim rules still apply.
