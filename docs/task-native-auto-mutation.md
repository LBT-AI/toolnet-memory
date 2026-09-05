# Native Task Auto Mutation

Phase 42D is the first Task Mirror phase that mutates Persistent Tasks. Provider
adapters still never write Task state directly.

## Canonical path

```text
Codex update_plan / OpenCode todowrite
                ↓
NormalizedSessionEvent
                ↓
42B structured adapter
                ↓
AgentPlanSnapshot
                ↓
42C durable source binding
                ↓
canonical AgentPlanSnapshot
                ↓
TaskMirrorEngine
                ↓
TaskMirrorMutationExecutor
                ↓
TaskStore / TaskStateEngine / TaskHandoffEngine
```

There is one mutation authority. Provider-specific adapters remain
read/normalize-only.

## Goal grouping

Each native provider session and plan receives one deterministic Goal:

```text
Goal: Codex native plan
├─ Task A
├─ Task B
└─ Task C
```

The Goal ID is scoped by project, provider, native session, and plan ID. Raw
native session IDs are not stored as Task labels.

## Native lifecycle

```text
pending       → Task pending
in_progress   → Task active
completed     → request Task completion
cancelled     → request Task cancellation
```

A native `completed` state does not bypass completion guards. Completion can still
fail with `TASK_COMPLETE_BLOCKED`, `TASK_COMPLETE_DEPENDENCIES_PENDING`,
`TASK_COMPLETE_CHILDREN_OPEN`, or `TASK_COMPLETE_PROGRESS_INCOMPLETE`.

The executor reports that conflict while retaining the valid Persistent Task
state.

## Auto claim and leases

Exactly one unambiguous native current item may be automatically leased:

```text
one in_progress → auto claim
```

If a provider reports multiple `in_progress` items, all lifecycle states are
mirrored but no item is automatically claimed. ToolNet never steals an
unexpired lease. Expired leases use the existing `TaskHandoffEngine` policy, and
an owned lease is renewed near expiry through `TaskHandoffEngine.heartbeat`.

Completion and cancellation clear active leases in the Task projection, so the
executor does not issue a redundant release after terminal transitions.

## Replay and crash recovery

Binding persistence happens before Task mutation:

```text
binding ledger append
        ↓
TaskMirrorEngine.plan()
        ↓
TaskMirrorMutationExecutor.execute()
```

If the process stops after the binding append but before Task mutation, replay
returns the same canonical binding and replans from the current Task projection.
Only missing mutations execute.

## Omission and cancellation

Missing native items are not cancelled. Only an explicit native `cancelled`
status may request cancellation.

## Runtime boundary

`syncNativeTaskMirrors()` provides the certified mutating pipeline, but Phase 42D
does not wire it into live Codex or OpenCode checkpoints. This prevents normal
running sessions from mutating Tasks until runtime integration is separately
certified.
