# ToolNet Multi-Host Convergence

## Current architecture

The active multi-host implementation is:

```text
src/multi-host/**
```

The old `src/sync/**` scaffold was not an implemented sync engine and has been
removed by repository truth cleanup.

## Operation model

Cross-host changes are represented as immutable operations.

An operation carries stable information such as:

- project
- scope
- host
- operation id
- payload digest
- timestamp

Operations are replayed in deterministic order.

This enables independently observed operation sets to converge on the same
projection when they contain the same immutable operations.

## What ToolNet does not claim

Current multi-host convergence is not documented as:

- WebSocket real-time synchronization,
- SSE synchronization,
- vector-clock CRDT,
- remote filesystem locking,
- database transaction replication.

Those transport/coordination layers may be added later without replacing the
append-only operation source of truth.

## Same-host writes

Local mutable project state uses bounded critical sections and atomic writes.

## Cross-host writes

Cross-host durability favors immutable operation creation and deterministic
reduction instead of pretending an object-storage backend offers a reliable
distributed lock.
