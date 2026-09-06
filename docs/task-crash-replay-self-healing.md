# Task Crash / Replay / Self-Healing

Phase 51 certifies recovery across the durability boundaries introduced by
Phases 42–50.

## Authoritative local sources

```text
Session WAL
Persistent Task operation log
```

The following are derived projections:

- Task `state.json`
- Native Task Mirror queue
- WorkState compatibility projection
- Tasks Panel projection

## Critical crash window

```text
SessionWal.append()
      ↓ fsync complete
PROCESS CRASH
      ↓
TaskMirror.enqueue() never ran
      ↓
next startup repairs WAL and replays all durable events
```

Native plan events cannot disappear merely because the process died after WAL
fsync. Source identity and Phase 42 binding reconciliation keep replay
idempotent.

## Tail recovery

An incomplete final JSONL fragment may be truncated back to the previous valid
newline. A complete invalid historical Task operation fails closed and is not
silently deleted.

## Projection recovery

`state.json` is a cache. Losing it does not delete Task state because the
immutable operation log rebuilds the projection.

## Lease recovery

Active leases are represented in Persistent Task operations. A process restart
therefore retains lease ownership until expiry, after which the existing
Phase 46/47 recovery rules apply.

## Failure isolation

Task recovery is downstream derived work. If Task projection recovery fails,
Session WAL capture continues; recovery exceptions cannot invalidate already
durable session events.

## Cross-host behavior

Phase 51 does not introduce distributed locking. Phase 45 immutable
replication and deterministic conflict detection remain responsible for
multi-host convergence.
