# Multi-Agent Task Orchestration

Phase 46 adds one orchestration facade over the existing Persistent Task lifecycle engine.
Persistent Tasks remain the execution authority; provider adapters do not claim or hand off Tasks.

## Execution flow

```text
ready Task
  ↓
deterministic task_next
  ↓
claim with bounded lease
  ↓
heartbeat while the scoped session is active
  ↓
release, explicit handoff, or lease expiry
  ↓
next agent resumes durable Task context
```

The orchestration engine refuses to claim, heartbeat, release, hand off, or attribute completion when an unresolved Phase 45 replication conflict targets the Task. Conflict history is retained and can only be marked resolved through an append-only resolution operation.

## Selection and safety

Ready selection is deterministic:

1. priority
2. hierarchy/order
3. creation time
4. Task ID

A valid lease is never stolen. An expired lease can be recovered by another agent, while the previous owner and `lease-expired-takeover` history remain visible. Completed, cancelled, blocked, and dependency-pending Tasks are not executable.

## Resume context

`task_resume_context` returns bounded durable execution data:

- title and lifecycle status
- progress, blocker, and next action
- dependencies
- files and test records
- evidence summaries
- completion snapshot when present
- last agent and append-only handoff history

It never returns raw WAL records, terminal transcripts, or hidden reasoning.

## Codex → OpenCode → Kiro

```text
Codex on VPS A claims Task X
        ↓ handoff
OpenCode on VPS B resumes Task X
        ↓ handoff
Kiro on VPS C continues Task X
```

Each handoff requires the current valid lease owner and creates a durable Task operation. A stale former agent cannot complete or heartbeat after ownership changes.

## CLI and MCP

The existing commands are routed through the orchestration facade:

```text
toolnet-memory task:next <rootId> --agent codex
toolnet-memory task:next <rootId> --agent codex --claim
toolnet-memory task:resume-context <taskId> --json
toolnet-memory task:conflict-resolve <taskId> --conflict-id <id> --agent codex
```

MCP exposes `task_next`, `task_claim`, `task_heartbeat`, `task_release`, `task_handoff`, and `task_resume_context`. Native provider Task mirroring remains independent of MCP control calls.

There is no distributed mutex, Redis coordinator, or hidden central scheduler. Cross-host behavior remains eventually consistent and conflict-safe through Phase 45 immutable operations.
