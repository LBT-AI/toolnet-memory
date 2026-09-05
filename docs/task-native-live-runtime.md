# Live Native Task Mirror Runtime

Phase 42E connects the certified native Task Mirror pipeline to normal ToolNet
session capture. Supported native plans now create and update Persistent Tasks
without an agent calling ToolNet MCP or CLI task commands.

## Runtime path

```text
Codex / OpenCode
      ↓
native session adapter
      ↓
SessionCore.record / recordMany
      ↓
SessionWal.append
      ↓
checkpointLocalSession
      ↓
NativeTaskMirrorRuntime.enqueue
      ↓
structured native-plan extraction
      ↓
persisted source binding
      ↓
Task lifecycle mutation
      ↓
Persistent Tasks
```

The bridge is centralized in `SessionCore`. Codex and OpenCode do not have
separate live Task-write paths.

## WAL-first ordering

The native session event must be durable before it can affect Persistent Tasks.
The ordering invariant is:

```text
WAL first
Task Mirror second
```

Task mirroring is asynchronous and serialized per `SessionCore`. `flush()`
waits for batches already accepted by that runtime. A Task Mirror failure is
recorded in `taskMirrorStatus()` and does not undo or reject the already-written
session WAL.

## Default and opt-out

Live native Task mirroring is enabled by default. Disable only this derived
projection with:

```bash
export TOOLNET_TASK_MIRROR=0
```

This does not disable Session WAL, Work Continuity, memory learning, manual
Persistent Tasks, Task CLI, or Task MCP.

## Native behavior

For supported providers:

```text
Agent creates native todo/plan
        ↓
ToolNet automatically creates Persistent Tasks
        ↓
Agent marks one item in_progress
        ↓
ToolNet starts and claims that Task
        ↓
Agent moves to another item
        ↓
ToolNet reconciles the old lifecycle and current lease
        ↓
Agent marks completed
        ↓
ToolNet requests completion through TaskStateEngine
```

Completion and lease guards remain authoritative. Multiple simultaneous
`in_progress` items are mirrored as active, but none is automatically claimed
when the provider cannot identify one current item. Missing items are not
implicitly cancelled.

ToolNet accepts only structured native events. Ordinary assistant prose that
mentions TODOs, `update_plan`, or `todowrite` is not parsed.

## Supported scope

Phase 42E automatically mirrors:

- Codex `update_plan`
- OpenCode `todowrite`

Other providers remain unchanged until they provide a structured native-plan
adapter.

## Phase 43 boundary

The completion description shown beneath a completed Task is not part of 42E.
Phase 43 will add Task Completion Snapshot / Native Result Capture for the
agent's visible completion summary, changed files, tests, verification, and
commit information.
