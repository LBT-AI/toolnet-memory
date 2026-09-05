# WorkState / Persistent Tasks Consolidation

Phase 44 makes Persistent Tasks the authoritative execution model while
preserving WorkState and `.toolnet/work/current.json` for compatibility and
startup context.

## Ownership

Persistent Tasks own execution state:

- identity and source binding
- lifecycle and guarded completion
- dependencies and progress
- blockers and next action
- lease and agent ownership
- evidence, files, tests, and completion snapshots

WorkState remains a compatibility/read model. It preserves context that is
useful to existing consumers, including goal and phase text, recent session
metadata, legacy observations, and fallback files/tests when no bound Task
exists. WorkState is not a second Task lifecycle database.

## Canonical flow

Before Phase 44, native events could update two state models independently:

```text
Session event
   ├── WorkObservation → WorkState
   └── native Task mirror → Persistent Tasks
```

The canonical runtime path is now:

```text
Native provider event
        ↓
NormalizedSessionEvent
        ↓
SessionWal.append()
        ↓
SessionCore.checkpointLocal()
        ↓
checkpointLocalSession()
        ↓
WorkObservation extraction + legacy compatibility projection
        ↓
Task Mirror enqueue
        ↓
Persistent Tasks
        ↓
Task-aware compatibility projection
        ↓
.toolnet/work/current.json and current.md
```

Provider adapters only normalize and capture source events. They do not call
`applyObservationsToLocalWorkState()` or write `current.json` directly.

## Task authority

When a native source item has a Phase 42C binding, the corresponding Task
wins for execution fields:

- Task title and lifecycle status
- progress
- blocker
- next action
- files touched
- tests
- agent/session compatibility metadata

A completed Task cannot regress because a stale observation says `pending`.
A blocked Task is not displayed as active merely because an old native event
reported `in_progress`. Completion and dependency/lease guards remain in the
Task State Engine; Phase 44 does not bypass them.

## Binding and fallback

Correlation uses the existing provider, native session, plan, and canonical
source binding. It never uses a TODO number or title as a global identity.

For a session with no relevant binding, the existing WorkObservation behavior
is preserved. This supports projects and sessions created before native Task
mirroring. If a projection request has multiple possible bound sessions and no
session identity can disambiguate them, the projector keeps the prior
compatibility state instead of guessing.

## Backward compatibility

The WorkState schema remains version 1. Existing readers of
`.toolnet/work/current.json` continue to receive the same shape. Observation
extraction, local WorkState mutation, remote observation replay, session
origin, context, brief, and handoff consumers remain available.

Persistent Task state is projected into that existing shape only when a safe
binding exists; no parallel completion or Task database is introduced.
