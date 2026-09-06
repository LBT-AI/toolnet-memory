# Persistent Tasks Production GA

Phase 52 consolidates the Persistent Task system built through Phases 33–51.

## Production execution path

```text
Native coding-agent plan
        ↓
Session WAL + fsync
        ↓
Native Task Mirror
        ↓
Persistent Task operation log
        ↓
Task lifecycle / dependencies / leases
        ↓
Completion Snapshot
        ↓
Cross-host replication
        ↓
Deterministic scheduler
        ↓
Multi-agent orchestration
        ↓
Session resume / self-healing
        ↓
Tasks Panel / MCP / CLI / WorkState compatibility
```

## Guided setup

Guided onboarding is available again:

```text
toolnet-memory setup
toolnet-memory setup --section storage
toolnet-memory setup --section integrations
toolnet-memory setup --section health
```

The runtime is local-first. No LLM or embedding provider is required.

## Storage

Default non-interactive setup uses `local`. Cloud storage remains optional.

## Doctor

`toolnet-memory doctor` includes Persistent Task health:

- task counts;
- active, blocked, and completed state;
- operation count;
- unresolved replication conflicts.

## Task migration

Task history remains append-only:

```text
toolnet-memory task:migrate
```

The command rebuilds the derived Task projection from immutable local and
replicated operations. It does not rewrite Task event history.

## Recovery

Session WAL and Persistent Task operation logs are authoritative. Derived state
such as `.toolnet/tasks/state.json` and `.toolnet/work/current.json` can be
rebuilt.

## Multi-agent execution

The GA architecture supports native Codex and OpenCode plan mirroring,
deterministic source identity, completion snapshots, cross-host replication,
conflict-aware leases, explicit handoff, crash resume, dependency scheduling,
and parallel independent Tasks.

No distributed lock is claimed.

## Versioning

Phase 52 certification is performed before the release version is bumped.
Version bump, commit, tag, and publish happen only after GA certification
passes.
