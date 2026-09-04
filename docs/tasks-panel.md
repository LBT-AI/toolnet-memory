# Tasks Panel

Phase 37 exposes Persistent Shared Tasks in the existing ToolNet Graph UI.
The panel is intentionally read-only.
Task mutations continue through the Phase 36 CLI/MCP interfaces and therefore
retain all Task Core, lifecycle, dependency and lease guards.

## Open

Run:

```text
toolnet-memory graph
```

Then select **Tasks**.

The panel shows the current local ToolNet project's durable Task state.

## Display

The current/resumable Task card shows:

```text
ACTIVE
5/10
Current Task title
agent: codex
Progress
██████████░░░░░░░░░░ 50%

Next
Implement step 6
```

Task hierarchy uses:

- ✓ completed
- ◉ active
- ! blocked
- ○ pending
- × cancelled

The tree displays:

```text
Goal
 ├─ Task
 │   ├─ Subtask
 │   └─ Subtask
 └─ Task
```

## Project scope

The Graph catalog may contain remote project snapshots.
Persistent Tasks in Phase 37 are deliberately scoped to the current local
ToolNet project.
The panel does not fabricate remote Task state for catalog projects.

## API

Read-only endpoint:

```text
GET /api/tasks
GET /api/tasks?rootTaskId=<id>
```

This endpoint is below the existing Graph `/api/*` security gate.
Therefore it inherits:

- Host-header validation,
- same-origin browser API validation,
- optional Bearer authentication,
- GET/HEAD-only policy,
- no-store cache policy.

`/api/tasks` does not expose raw Task operation logs.
It returns a compact derived view.

## Security

The browser never directly reads:

- `.toolnet/tasks/events.jsonl`
- `.toolnet/tasks/state.json`

and never writes Task files.

The panel does not expose complete evidence/test history or raw operation
history.
It displays only execution-state fields needed for project coordination.

## Refresh

The panel polls every 3 seconds only while visible.
There is no WebSocket coordinator, remote lease daemon or fake distributed
lock.

## Limits

The rendered tree is capped at 500 Task items.
The authoritative Task state is not truncated.
Only the UI response is bounded.

## Phase boundary

Phase 37 provides visualization only.
Phase 38 adds automatic deterministic evidence capture.

No LLM, embeddings or vector database are introduced.
