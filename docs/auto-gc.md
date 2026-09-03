# ToolNet Memory Automatic GC

Automatic garbage collection is optional and disabled by default.

Enable:

```bash
export TOOLNET_AUTO_GC=on
toolnet-memory service
```

Default schedule: **168 hours** (approximately weekly).

## Project discovery

The scheduler does not recursively scan the filesystem. It runs only
for:

1. an already initialized ToolNet project in the service working
   directory, or
2. initialized project roots observed through ToolNet service requests.

Strict existing-project resolution is used. The scheduler does not
initialize a project as a side effect.

## Default scope

By default automatic GC handles eligible local runtime garbage only.
Remote snapshot deletion remains disabled:

```text
TOOLNET_AUTO_GC_REMOTE=off
```

To explicitly include remote snapshot retention:

```bash
export TOOLNET_AUTO_GC_REMOTE=on
```

## Retention configuration

- `TOOLNET_AUTO_GC_INTERVAL_HOURS`
- `TOOLNET_AUTO_GC_TICK_MINUTES`
- `TOOLNET_AUTO_GC_KEEP_SNAPSHOTS`
- `TOOLNET_AUTO_GC_RUNTIME_DAYS`
- `TOOLNET_AUTO_GC_STALE_LOCK_MINUTES`
- `TOOLNET_AUTO_GC_SNAPSHOT_DAYS`

## Safety

The scheduler reuses the existing deterministic `GarbageCollector`. This
means automatic execution preserves the same GC rules as the manual
command:

- semantic memory protected,
- current work protected,
- context protected,
- journal protected,
- audit log protected,
- WAL/state protected,
- legacy sessions protected,
- immutable remote operation history protected,
- live locks protected.

Candidate state is revalidated before deletion.

## Scheduling state

Per-project scheduler state is stored at:

```text
.toolnet/runtime/gc/auto-gc-state.json
```

The scheduler records:

- last attempt,
- last successful run,
- next due time,
- deletion counts,
- bytes freed,
- latest error.

## Coordination

Automatic GC acquires `.toolnet/runtime/gc/auto-gc.lock` with an
exclusive local filesystem claim. This prevents two service processes
sharing the same project filesystem from performing the same scheduled
GC concurrently. It is not a distributed S3/R2 lock.

## Audit

Every scheduled execution is recorded as `gc.auto` in the project audit
log.
