# Task State Engine

Phase 34 adds deterministic lifecycle and execution state on top of the
Phase 33 append-only Task Core.

## Lifecycle

Public lifecycle transitions are:

```text
pending -> active
pending -> cancelled
active -> blocked
active -> completed
active -> cancelled
blocked -> active
blocked -> cancelled
```

`completed` and `cancelled` are terminal in Phase 34.

Re-opening terminal tasks is intentionally not supported yet.

### Blockers

Blocking a task requires a non-empty reason.

Example state:

```text
status: blocked
blocker:
  reason: Waiting for provider API
nextAction: Retry integration after API access
```

Resuming a blocked task moves it back to `active` and clears the blocker.

### Progress

Tasks may store explicit progress:

```text
5 / 10
```

For parent tasks with direct children, UI progress is derived from child state.

For example:

```text
5 closed
5 open
progress = 5/10
```

This allows the future Tasks panel to render deterministic progress without an
LLM.

### Completion guard

A task cannot transition to `completed` while:

- it has an active blocker,
- a dependency is incomplete,
- a direct child is `pending`/`active`/`blocked`,
- explicit progress has `completed < total`.

The mutation is rejected before entering the authoritative operation log.

### Dependencies

A task may depend on other project tasks.

Phase 34 prevents:

- self-dependency,
- dependency on a missing task,
- dependency cycles.

Completion requires every dependency to have status `completed`.

### Evidence

Evidence is append-only task metadata.

Supported kinds:

- `note`
- `file`
- `test`
- `commit`
- `artifact`
- `review`

Phase 34 exposes manual evidence primitives.

Automatic evidence extraction from tool/file/test/commit activity is reserved
for Phase 38.

### Files touched

Tasks can record unique project-relative file paths.

Duplicate file events do not duplicate the projected file list.

### Test records

Task test history records:

- `pass`
- `fail`
- `skip`

Test history is durable but does not automatically complete a task.

Automatic evidence/completion policy belongs to Phase 38.

### Next action

Every `active` or `blocked` task may hold a deterministic `nextAction`.

This provides continuity when another agent takes over the same project.

### Resume state

`TaskStateEngine.resumeState(taskId)` returns:

- root task,
- task that should be resumed,
- deterministic progress,
- blocker,
- next action,
- unresolved dependencies,
- direct children.

Selection order is:

1. `active`/`blocked` child,
2. first `pending` child whose dependencies are satisfied,
3. root task.

Phase 35 builds full multi-agent handoff and claim behavior on this primitive.

## Compatibility

Phase 33 `task.status.set` operations remain replayable for existing local logs.

New lifecycle code uses:

```text
task.lifecycle.transition
```

so stronger lifecycle rules do not corrupt historical Phase 33 task logs.

## Architecture

No LLM, embedding provider, vector database or mandatory encryption key is
introduced.
