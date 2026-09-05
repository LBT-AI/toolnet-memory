# Cross-Host Persistent Task Replication

Phase 45 makes Persistent Tasks converge across VPS hosts without introducing a
shared writable state file or a distributed lock.

## Architecture

```text
local authored immutable operation log
                 ↓
       immutable remote task batches
                 ↓
          host-scoped operation set
                 ↓
       deterministic reconciliation
                 ↓
          converged Task projection
                 ↓
       WorkState / Context / Panel / MCP
```

Each host keeps its existing local `.toolnet/tasks/events.jsonl`. Replicated
operations are imported into `.toolnet/tasks/replication/replicated/` and are
never appended to the local authored sequence. The local `state.json` remains a
rebuildable projection and is not authoritative remote state.

## Not distributed locking

This implementation is **NOT distributed locking**. It does not use Redis,
Redlock, etcd, a database lock, or an object-store mutex. Hosts may mutate
locally while offline. They publish immutable batches later, and every host
rebuilds the same logical projection from the union of valid operations.

Remote batch keys are deterministic from project, host, local sequence range,
and operation content hash. Repeating an upload targets the same logical object;
an existing object with different content is an immutable conflict and is never
overwritten.

## Identity and sequencing

Task operations retain their original `hostId`, `operationId`, and local
`sequence`. A local sequence is never interpreted as globally unique or globally
ordered. Deduplication uses `(hostId, operationId)`, while deterministic
reconciliation uses host-scoped sequence order and stable identity tie-breakers.

Foreign `expectedRevision` values are not treated as global revisions during
reconciliation. They remain meaningful for local interactive mutation, but are
removed from the derived replay copy before a foreign operation is applied.
Authored operation records are preserved unchanged.

## Eventual consistency and offline work

A local Task mutation is durable after its local operation log fsync and does not
depend on remote availability. Push failure is fail-soft. When connectivity
returns, the uploader resumes after the last acknowledged local sequence.

Pull validates project identity, host scope, operation hashes, batch hashes, size
bounds, and deterministic batch identity before importing operations. Imported
operations are stored locally as a derived cache and can be downloaded again
without producing duplicate logical mutations.

## Conflict semantics

Conflicts preserve all immutable authored inputs and are reported by the
convergence result and `task:conflicts` diagnostic command.

- completed versus blocked lifecycle operations report `TASK_LIFECYCLE_CONFLICT`;
- incompatible concurrent claims report `TASK_LEASE_CONFLICT`;
- different immutable completion digests report `TASK_COMPLETION_CONFLICT`;
- reused operation identity with different content reports
  `TASK_REPLICATION_OPERATION_COLLISION`;
- invalid or out-of-order operations report a replication guard/order conflict.

The reconciler does not silently overwrite an immutable completion, claim, or
source operation. Ambiguous or invalid input is retained for diagnosis and is
not allowed to corrupt the projection.

## Operations

Normal agent operation does not require a sync command. For diagnosis or manual
recovery, the CLI supports:

```text
toolnet-memory task:sync
toolnet-memory task:sync --push
toolnet-memory task:sync --pull
toolnet-memory task:sync --json
toolnet-memory task:conflicts
```

Replication can be disabled with `TOOLNET_TASK_REPLICATION=0`. Disabling the
runtime does not disable local Task mutation, Session WAL, or native Task
mirroring.

## WorkState compatibility

Phase 44 remains the compatibility boundary. WorkState and `current.json` are
read models for legacy startup/context consumers. Once a Task operation is
converged locally, Task status, blocker, next action, files, tests, lease, and
completion remain the execution authority. No second remote WorkState
synchronization path is created.
