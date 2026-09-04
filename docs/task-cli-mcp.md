# Task CLI + MCP

Phase 36 exposes Persistent Shared Tasks through the ToolNet CLI and MCP server.

## CLI

Core commands:

```text
task:list
task:show
task:create
task:update
task:start
task:block
task:resume
task:complete
task:progress
task:next-action
task:dependency-add
task:dependency-remove
task:evidence
task:file
task:test
task:claim
task:heartbeat
task:release
task:handoff
task:next
```

Examples:

```bash
toolnet-memory task:create \
  --kind goal \
  --title "Ship v0.4.0"

toolnet-memory task:list --json

toolnet-memory task:progress TASK_ID \
  --done 5 \
  --total 10

toolnet-memory task:claim TASK_ID \
  --agent opencode

toolnet-memory task:handoff TASK_ID \
  --from opencode \
  --to codex \
  --reason "Continue from checkpoint"

toolnet-memory task:next GOAL_ID \
  --agent codex \
  --claim
```

Every Task command resolves an existing ToolNet project.
Task CLI does not implicitly initialize a project.
Use `--project /path/to/project` to operate on a specific existing project.

## MCP

Phase 36 MCP tools:

```text
task_list
task_get
task_create
task_update
task_start
task_block
task_resume
task_complete
task_progress
task_next_action
task_dependency_add
task_dependency_remove
task_evidence_add
task_file_touch
task_test_record
task_claim
task_release
task_handoff
task_next
```

MCP tools use the project already resolved by the ToolNet MCP context.
They never read or mutate raw `.toolnet/tasks/events.jsonl` directly.
All mutations flow through `TaskStore`, `TaskStateEngine` or `TaskHandoffEngine`.

This preserves:

- append-only authoritative operations,
- revision guards,
- lifecycle guards,
- dependency cycle guards,
- completion guards,
- local `O_EXCL` serialization,
- lease ownership rules.

## Agent continuity

When a user asks an agent to continue previous project work:

1. existing ToolNet continuity memory still resolves historical context;
2. `task_next` or `task_get` resolves durable current execution state;
3. the agent may claim the recommended task;
4. work continues from persisted progress and `nextAction`.

Agents should not reconstruct Task state by reading:

- `.toolnet/tasks/events.jsonl`
- `.toolnet/tasks/state.json`

directly.

## Standalone

The same Task CLI routes are included in the standalone binary router.
No npm-only Task behavior is claimed.

## Runtime architecture

Phase 36 adds no:

- LLM,
- embedding provider,
- vector database,
- mandatory encryption key,
- fake remote distributed lock.
