# Storage Compatibility & Migration Model (Phase 84B)

One declared model for what a persisted store **is** and what a build may do with
it across versions. It is read-only: nothing here migrates, deletes or rewrites
stored data.

Module: `src/storage/compatibility/`

```
types.ts     — StoreClass, StoreCompatibility, StoreStatus, reason codes
registry.ts  — the single contract table + key/source-path classification
check.ts     — decideStoreCompatibility / checkStoreCompatibility / summary
```

## Why it exists

A store's class was previously inferred per call site, and the release gate
treated _any_ modified tracked file under `src/storage` as an authority schema
change. That flagged a pure barrel re-export and a **derived** cache read/write
change as blocking migrations. Classification is now declared once and consumed
everywhere.

## Store classes

| Class       | Meaning                                                                                                                                        | On version mismatch                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `authority` | Durable truth (Memory, task operation log, ADR, project identity, retrieval feedback/overrides/telemetry, session WAL, recovery backups).      | Block. Never rebuilt, never dropped. |
| `derived`   | Regenerated from a declared source of truth (graph, manifest, resolution, coverage, cross-service, fleet, artifacts, chunks, vectors, traces). | `rebuild_required`.                  |
| `ephemeral` | Process-lifetime state (daemon state/lock/socket/logs, runtime locks, cursors, artifact staging, in-memory test runs).                         | `rebuild_required`.                  |
| `unknown`   | No contract could be resolved.                                                                                                                 | Block — never guess.                 |

## Store contract

Every store declares: `kind`, `storeClass`, `schemaVersion`,
`supportedLegacyVersions`, `compatibility`, `missingVersionPolicy`, `sourceOfTruth`,
`legacyValueDomains` and a description.

`compatibility` is one of `exact`, `backward_compatible`, `rebuild_required`,
`migration_required`, `unsupported`.

`missingVersionPolicy` decides what an unversioned payload means: `accept` (the
store never carried a marker), `assume_legacy` (read as the oldest supported
version) or `reject` (block).

## Compatibility result

`status` is `compatible | migrated | rebuild_required | blocked`.

| Reason code                      | When                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `STORE_SCHEMA_CURRENT`           | Payload matches the declared current version.                                             |
| `STORE_SCHEMA_LEGACY_COMPATIBLE` | A supported legacy version, or legacy values were normalized in memory.                   |
| `STORE_MIGRATION_REQUIRED`       | Authority data at a supported legacy version needs an explicit migration.                 |
| `DERIVED_STORE_REBUILD_REQUIRED` | Derived/ephemeral data at a legacy, unsupported or future version is regenerated.         |
| `AUTHORITY_MIGRATION_REQUIRED`   | Authority data at an unsupported older version.                                           |
| `STORE_SCHEMA_UNSUPPORTED`       | Authority data written by a newer schema, or an unversioned payload the contract refuses. |
| `STORE_UNKNOWN`                  | No declared contract for the store kind.                                                  |

`summariseStoreCompatibility` aggregates to one verdict:
`blocked` > `rebuild_required` > `migrated` > `compatible`.

## No data loss

- Authority data is never silently rebuilt, truncated or deleted. An unreadable
  authority version blocks; it never "falls back".
- Derived data may be regenerated only because its source of truth is declared.
- An unknown store kind blocks rather than being guessed at.
- A compatibility check is pure: it reads nothing and writes nothing.

## Legacy resolution snapshot (worked example)

The legacy symbol-resolution snapshot declared `version: 1` but used the kind
vocabulary `CALL`, `REFERENCE`, `EXTENDS`, `IMPLEMENTS`; the current vocabulary is
`call`, `type`, `inheritance`, `implementation`, `member`. Because the numeric
version never changed, a reader comparing `kind` against the new literals skipped
every legacy entry silently.

Resolution (`src/code-intelligence/resolution/legacy.ts`, declared in the
registry as legacy value domain `resolution_kind_uppercase`):

- the mapping is `CALL → call`, `REFERENCE → type`, `EXTENDS → inheritance`,
  `IMPLEMENTS → implementation`;
- every entry is kept, in order, with its original value retained as `legacyKind`;
- an unknown vocabulary is preserved verbatim rather than rewritten or dropped;
- reads normalize in memory only — the stored object is never rewritten by a read;
- writes are canonicalized, and the `legacyKind` marker is dropped once the
  deterministic mapping has been applied, so a new write never carries the
  archived vocabulary forward.

The store's `loadWithCompatibility()` returns the normalized snapshot together
with the `StoreCompatibilityResult`, which is `migrated` +
`STORE_SCHEMA_LEGACY_COMPATIBLE` when normalization occurred.

## Release analysis integration

`release_readiness` classifies every changed file under `src/storage` by its
contract and reports a `StorageChangeReport` (`authority`, `derived`, `migration`,
`unclassified`, `additive`):

- `authority` → `AUTHORITY_SCHEMA_MIGRATION_REQUIRED` (blocking)
- `unclassified` → `STORAGE_CLASSIFICATION_UNKNOWN` (blocking)
- `derived` → `DERIVED_STORAGE_CHANGED` (review)
- `migration` → `STORAGE_MIGRATION_CHANGED` (review)
- barrel / infrastructure files → no reason (no persisted schema)
- untracked files → `additive` (listed individually via `git status -uall`)

## Certification

`npm run phase84b:certify` —
`tests/production/phase84b-storage-compatibility.test.ts`,
marker `PHASE84B_STORAGE_COMPATIBILITY=PASS`.

---

# Upgrade Orchestration & Migration Execution (Phase 84C)

The 84B model says what a store **is**. Phase 84C says what an upgrade must
**do**, in what order, and what it must refuse to do.

Module: `src/production/upgrade/`

```
types.ts            — plan, action, blocker, failure and warning vocabulary
migrations.ts       — the authority migration registry (explicit and versioned)
fingerprint.ts      — build identity + drift (protocol, package, marker, schema)
order.ts            — the fixed phase order
plan.ts             — buildUpgradePlan: pure and deterministic
run.ts              — runUpgrade: ordered execution, dry run, partial failure
observations.ts     — which local stores exist, and what version they claim
ports.ts            — the only module with side effects
package-upgrade.ts  — the flow the `toolnet-memory update` command runs
```

## Actions

| Action             | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `compatible`       | Leave the store alone; a reader handles it as-is.                       |
| `migrate`          | Run an explicit, declared authority migration. Requires a backup first. |
| `rebuild`          | Regenerate a derived store from its declared source of truth.           |
| `block`            | Stop the upgrade. Authority and unknown stores only.                    |
| `ignore_ephemeral` | Discard it once the plan is proven executable.                          |

## Phase order

1. inspect compatibility
2. block unsupported authority migration
3. back up authority state when a migration is planned
4. run authority migration
5. verify migrated authority
6. rebuild derived stores
7. clear ephemeral state
8. restart the daemon when the build identity changed
9. post-upgrade verification

The order is enforced by `order.ts` and asserted by the certification suite.

## Dry run

`runUpgrade` defaults to `dryRun: true`. A dry run performs no write, no cache
clear and no daemon restart: it returns the plan and a per-phase description of
what apply _would_ do. `update` opts in explicitly with `dryRun: false`.

## Authority migrations

The registry is intentionally **empty**: every authority store is still at
schema v1, so there is nothing to migrate. A legacy authority payload with no
declared migration is `UPGRADE_AUTHORITY_MIGRATION_MISSING` — a hard blocker.
Authority is never rebuilt and never deleted, and a migration always takes a
durable disaster-recovery backup first, re-reads the result, and only then lets
derived data be regenerated.

## Derived rebuilds

A derived store is regenerated, never migrated. Rebuild is planned when its own
schema is unreadable, or when the build identity changed and the contract is
`rebuild_required`. A `backward_compatible` derived store (today: the resolution
snapshot fixed in 84B) stays `compatible` with a **rebuild optional** marker, so
no destructive migration is ever invented for it. Nothing derived is deleted in
the upgrade path: a rebuild that has not run yet cannot be verified.

## Daemon barrier

The restart decision is driven by the Phase 77 build fingerprint — protocol
version, package version, explicit build marker, runtime schema fingerprints and
runtime root — never by the package version alone. A schema or build-marker change
at an unchanged version still requires a restart. The daemon is restarted only
after migration and rebuild succeed; a failed restart is a failure, never a
silent old-daemon/new-CLI coexistence.

## Partial failure

A stopped upgrade reports a specific code (`UPGRADE_MIGRATION_FAILED`,
`UPGRADE_REBUILD_FAILED`, `UPGRADE_EPHEMERAL_CLEAR_FAILED`,
`UPGRADE_VERIFY_FAILED`, `UPGRADE_DAEMON_RESTART_FAILED`) plus
`UPGRADE_PARTIAL_FAILURE` when live state had already changed. The remaining
phases are reported as `not reached`, the daemon is never restarted, and the
pre-migration authority backup stays verifiable and is reported back.

## Certification

`npm run phase84c:certify` —
`tests/production/phase84c-upgrade-orchestration.test.ts`,
marker `PHASE84C_UPGRADE_ORCHESTRATION=PASS`.

---

# End-to-End Upgrade & Rollback (Phase 84D2A)

`tests/production/phase84d2a-upgrade-recovery-e2e.test.ts` drives the real
orchestration and the real disaster-recovery subsystem over a real project
fixture — no mocked storage layer, no mocked backup.

The fixture is a pre-upgrade install: the task operation log and projection are
written by the real task store, and the storage provider holds authority
(`memory/records`, `knowledge/adr`, `project.json`), derived (`graph`, the legacy
resolution snapshot) and excluded derived caches (`graph/artifacts`,
`snapshots`).

## What the success path proves

inspect → **back up authority** → migrate → verify → rebuild derived → clear
ephemeral → verify, with these invariants asserted:

- every authority file is byte-identical before and after the upgrade;
- the migrated payload keeps every record it moved forward;
- the derived task projection is regenerated **from the operation log**, not from
  itself (the fixture's projection starts deliberately stale);
- only ephemeral state is removed, and it is removed within its declared scope.

## What the backup proves

- the manifest and its digest verify, with no missing blob and no hash mismatch;
- every declared local authority source is present with its expected role;
- remote authority objects are captured;
- the derived caches the subsystem excludes (`/graph/artifacts/`, `/snapshots/`)
  stay excluded, and being inside a backup never changes what a store *is* —
  `classifyStorageKey` still reports `derived` for them.

## Failure and rollback

Migration failure, verification failure and rebuild failure each produce a
structured code and never report success. The daemon is not restarted after any
of them, the backup stays verifiable, and the phases after the failure are
reported as `not reached`.

Restoring from the pre-migration backup then gives back authority byte for byte,
rebuilds the task projection from the restored log, leaves the derived cache
regenerable, and never restores stale locks or ephemeral runtime state. A damaged
backup is refused with `RECOVERY_BACKUP_INTEGRITY_FAILED`.

> One authority file, `.toolnet/retrieval/overrides.json`, is **re-certified**
> rather than restored verbatim: the recovery subsystem recomputes adaptive
> retrieval overrides from the restored feedback log. The upgrade itself never
> touches it. It is excluded from the byte-identity assertion for exactly this
> documented reason.

## Legacy resolution through the whole path

The legacy `CALL` / `REFERENCE` / `EXTENDS` / `IMPLEMENTS` vocabulary — plus a
vocabulary nothing recognises — survives a full upgrade, a failure and a
rollback with every entry intact. A read never rewrites the stored object, a
write canonicalizes the four known kinds and drops their provenance marker, and
the unknown entry keeps both its raw value and its marker so nothing is lost.

## Certification

`npm run phase84d2a:certify` —
`tests/production/phase84d2a-upgrade-recovery-e2e.test.ts`,
marker `PHASE84D2A_UPGRADE_RECOVERY_E2E=PASS`.
