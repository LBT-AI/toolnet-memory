# Release Intelligence (Phase 83)

Release Intelligence turns the current repository state into a deterministic,
read-only release-readiness report. It is an analysis and certification layer,
**never** a publisher: it does not commit, push, tag, bump a version or run
`npm publish`, and it never returns `safeToPublish` / `safeToMerge`.

Module: `src/code-intelligence/release/`
MCP tool: `release_readiness` (operations: `status`, `analyze`, `manifest`, `notes`)

## What it reports

- **Source capability inventory** — MCP tools registered in `src/mcp/server.ts`,
  `phaseNN:certify` scripts in `package.json` and `CodeIntelligenceRuntime`
  interface methods. No README/roadmap claims are trusted.
- **Packaged capability inventory** — tools extracted from the real
  `bundle/mcp.js` (both quote styles, minified).
- **Parity** — a source MCP tool missing from the package is
  `PACKAGED_CAPABILITY_MISSING` + `BUNDLE_STALE` and blocks release.
  Runtime methods and certification scripts are not bundle content and are
  never flagged for being absent from the bundle.
- **Version truth** — package.json, package-lock (root + lock), MCP server
  identity (inactive context), release-manifest, `.release-target` and the
  newest local tag. Divergence between active sources is
  `VERSION_SOURCE_DIVERGENCE`; a version that cannot represent the implemented
  capability phases is `VERSION_TRUTH_STALE`.
- **Release manifest truth** — the manifest's declared certification phases are
  compared against the implemented phases; a lag produces
  `RELEASE_MANIFEST_STALE`.
- **Public-surface compatibility** — structural, direction-aware comparison of
  MCP tools, CLI commands, daemon protocol (version change is breaking; kind
  additions are additive; a module absent at baseline is an addition, never a
  break) and the artifact schema version (change ⇒
  `ARTIFACT_SCHEMA_REBUILD_REQUIRED`, a derived-cache rebuild, not a break).
  A baseline module that did not exist is a pure addition.
- **Authority storage safety** — every `src/storage` file is classified by the
  store contract it implements (`authority` / `derived` / `ephemeral`, plus a
  barrel/infrastructure role), never by the directory it lives in. A *modified
  tracked* file backing an **authority** store ⇒
  `AUTHORITY_SCHEMA_MIGRATION_REQUIRED` (blocking); a file whose contract cannot
  be resolved ⇒ `STORAGE_CLASSIFICATION_UNKNOWN` (blocking, never guessed). A
  **derived** store change is `DERIVED_STORAGE_CHANGED` and a changed migration
  script is `STORAGE_MIGRATION_CHANGED` (both review-level). Barrel and
  infrastructure files carry no persisted schema, and new untracked storage
  files are additive extensions — none of them can block by themselves.
- **Package audit** — `npm pack --dry-run --json` (never publish); required
  entrypoints, sensitive-path detection (`.env` yes, `.env.example` no) and
  unexpected derived-state/cache paths.
- **Reproducibility** — optional controlled double rebuild comparing
  normalized bundle fingerprints (`rebuild: true`).
- **Semver recommendation** — `major` only for a verified incompatible public
  contract change, `minor` for purely additive capability, `patch` when no
  public surface changed, `unknown` when the baseline is unknown or
  compatibility coverage is incomplete. Advisory only; never applied.
- **Certification inventory** — phase scripts discovered dynamically; the
  required chain is 68..83 and a missing/failing one blocks release.
- **Release notes candidate** — Added/Changed/Compatibility/Migration/Known
  limitations derived from real capability deltas, no marketing.

## Readiness decision

`ready` | `review_required` | `blocked` with machine-readable reason codes.
`ready` means "no blocker detected within the verified declared surfaces" —
never a global safety guarantee. Dirty worktree is
`DIRTY_WORKTREE` + `FINAL_RELEASE_REQUIRES_COMMITTED_TREE` (review), not fatal.

## Guarantees

- Read-only git only (`status`, `diff`, `show`, `rev-parse`, `branch`,
  `ls-files`, `tag`), argument arrays, no shell, revisions validated
  (`isSafeRevision`), `--end-of-options` where refs are resolved.
- No LLM, no embeddings, no vector database, no network.
- Non-interference: Memory, Tasks, ADRs, runtime traces, test evidence, the
  static graph and artifacts are never modified. Candidate manifests and notes
  are returned in-memory, never written.
- Deterministic: content-based worktree fingerprint (mtime-insensitive),
  sorted inventories, stable ordering; no timestamps in identities.
