# Persistent Native Task Mirror Bindings

Phase 42C adds a durable identity layer between native agent task lists and
ToolNet Persistent Tasks. Phase 42C does not mutate Persistent Tasks.

## Durable files

```text
.toolnet/tasks/mirror-bindings/events.jsonl
.toolnet/tasks/mirror-bindings/state.json
.toolnet/runtime/locks/task-mirror-bindings.lock
```

`events.jsonl` is authoritative and append-only during normal operation.
`state.json` is derived and can be rebuilt from the event log. The binding
ledger uses its own lock; it does not bypass the TaskStore lock or operation
validation because it never writes the TaskStore.

## Identity layers

```text
Native title
    ↓
42B content-derived raw sourceKey
    ↓
42C durable binding
    ↓
canonicalSourceKey
    ↓
TaskMirrorEngine
    ↓
Persistent Task ID
```

A binding stores every historical raw source key observed for the logical item.
This handles status changes, native reorder, replay, omission/reappearance, and
process restart without putting provider metadata into `TaskRecord`.

## Replay and ordering

The pair `scope + sourceEventId` is immutable:

- same source event and same snapshot: replay, no additional append;
- same source event and different snapshot: `TASK_MIRROR_BINDING_SOURCE_EVENT_COLLISION`;
- older numeric source sequence: `TASK_MIRROR_BINDING_STALE_SOURCE_SEQUENCE`;
- equal numeric sequence from a different event: `TASK_MIRROR_BINDING_SOURCE_SEQUENCE_COLLISION`.

A corrupt final JSONL record may be truncated only while holding the binding
lock. Corruption followed by later valid data is rejected rather than silently
repaired.

## Conservative rename correlation

The strongest signal is continuity of one unique native current item:

```text
previous unique current item
          ↓
       title change
          ↓
next unique current item
          ↓
    same durable binding
```

A secondary match is allowed only when exactly one previous visible binding and
one current native item are unmatched, and the previous item was already
`in_progress` or `blocked` with a valid lifecycle continuation.

ToolNet does not correlate:

```text
pending A → pending B
```

based only on order. When multiple active unmatched items make the result
ambiguous, it emits `TASK_MIRROR_BINDING_RENAME_AMBIGUOUS` and creates new
bindings instead of guessing.

## Omission semantics

Absence from a native full plan does not delete a binding: `absence != cancellation`.
Historical aliases remain available if an omitted item later reappears. Only an
explicit native `cancelled` status can later request cancellation in a future
mutation phase.

## Shadow boundary

The correlated pipeline is:

```text
Structured native event
        ↓
42B provider adapter
        ↓
Raw AgentPlanSnapshot
        ↓
Durable binding correlation
        ↓
Canonical AgentPlanSnapshot
        ↓
TaskMirrorEngine.plan()
        ↓
Shadow TaskMirrorPlan
```

Allowed side effect: writing the binding ledger and derived projection.

Forbidden in Phase 42C: `TaskStore.createTask`, `TaskStore.patchTask`, lifecycle
mutation, completion, cancellation, claim, release, or handoff. Actual
Persistent Task mutation remains reserved for a later phase.
