# Native Agent Plan Adapters

Phase 42B converts structured native task/todo tool events into the
`AgentPlanSnapshot` contract introduced by Phase 42A.

Phase 42B is shadow-only. It does not create, patch, start, complete, cancel,
claim, release, or hand off Persistent Tasks.

## Codex

ToolNet consumes the structured Codex `update_plan` function call:

```json
{
  "explanation": "optional",
  "plan": [
    { "step": "Inspect repository", "status": "completed" },
    { "step": "Implement adapter", "status": "in_progress" },
    { "step": "Run tests", "status": "pending" }
  ]
}
```

Accepted Codex statuses are `pending`, `in_progress`, and `completed`.
ToolNet does not parse assistant prose to reconstruct this plan.

## OpenCode

ToolNet consumes the structured OpenCode `todowrite` tool part:

```json
{
  "todos": [
    { "content": "Inspect repository", "status": "completed", "priority": "high" },
    { "content": "Implement adapter", "status": "in_progress", "priority": "high" }
  ]
}
```

Accepted OpenCode statuses are `pending`, `in_progress`, `completed`, and
`cancelled`.

The preferred source is `state.input.todos`. Structured metadata is a fallback,
and a short valid JSON `outputSummary` is the final fallback.

## Item identity

Neither current Codex `update_plan` nor OpenCode `todowrite` exposes a stable
per-item identifier. ToolNet therefore uses a content-derived source key.

This means:

- status changes retain identity,
- array reordering retains identity,
- identical titles use deterministic occurrence numbers,
- the same title in different sessions remains isolated,
- array position is never the identity.

A native rename currently creates a new source key. ToolNet does not guess that
an unrelated replacement item is a rename. Persisted rename correlation requires
additional source-binding state and is not enabled in Phase 42B.

## Current task and deletion semantics

Exactly one `in_progress` item becomes `currentSourceKey`. If a provider reports
multiple `in_progress` items, all items remain in the snapshot, no item is chosen
for automatic claim, and a diagnostic is emitted.

A missing item is never interpreted as deleted or cancelled. Only an explicit
native `cancelled` state may later request cancellation.

## Shadow pipeline

```text
NormalizedSessionEvent
        ↓
Native provider parser
        ↓
AgentPlanSnapshot
        ↓
TaskMirrorEngine.plan()
        ↓
Shadow TaskMirrorPlan
```

No Persistent Task mutation occurs in Phase 42B. Existing Codex and OpenCode
runtime sync paths are intentionally unchanged; runtime wiring follows fixture
and replay certification.
