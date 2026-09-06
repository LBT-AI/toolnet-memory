# Deterministic Task Dependency Scheduler

Phase 49 introduces a read-only scheduler over the converged persistent Task
projection. It does not add another Task state machine.

## Inputs

The scheduler consumes:

- persistent Task projection
- Task dependencies
- lifecycle status
- blockers
- active leases
- replication conflicts
- requesting agent identity

## Output

Tasks are classified as:

```text
ready
owned
waiting_dependencies
blocked
foreign_lease
conflicted
terminal
```

The scheduler also exposes `parallelReadyTaskIds`, the deterministic set that
Phase 50 may distribute to multiple agents.

## Automatic dependency unlocking

No mutation is necessary to unlock a dependent Task. Readiness is re-derived
from the current projection:

```text
A → B → C
A pending:    ready = A
A completed:  ready = B
B completed:  ready = C
```

## Parallel safety

A lease held by another agent blocks only that Task. It does not prevent an
independent sibling from being scheduled:

```text
Task A → leased by Codex
Task B → independent
OpenCode scheduler:
  A = foreign_lease
  B = ready
```

## Hierarchy

When a Task owns descendants, the scheduler treats leaf descendants as the
execution candidates. This prevents container Tasks and their subtasks from
being offered for execution simultaneously.

## Authority

The scheduler does not:

- claim Tasks
- start Tasks
- complete Tasks
- modify dependencies
- change `Task.progress`
- change `Task.activityProgress`

Task lifecycle and dependency guards remain authoritative.
