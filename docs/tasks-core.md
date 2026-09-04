# Persistent Shared Tasks

Phase 33 introduces the durable Task Core for ToolNet Memory.
Task state belongs to the project, not to one coding-agent session.

## Hierarchy

```text
Goal
  └── Task
       └── Subtask

Task kinds:

goal
task
subtask

Task status values are stored by the core:

pending
active
blocked
completed
cancelled

Phase 34 adds lifecycle-transition policy, progress, blockers, dependencies and
evidence rules.

Durable files

Authoritative operation log:

.toolnet/tasks/events.jsonl

Derived projection:

.toolnet/tasks/state.json

Local coordination lock:

.toolnet/runtime/locks/tasks.lock

events.jsonl is authoritative.

state.json is a rebuildable deterministic projection.

Shared project state

Tasks are not filtered by the agent that created them.

Agent identity is attribution metadata only.

A task created by OpenCode may later be read and continued by Codex, Claude,
Kilo, ToolNet CLI or another supported agent.

Agent-specific handoff behavior is implemented in later phases.

Append-only operations

Phase 33 operations:

task.created
task.patched
task.status.set

Every operation contains:

operationId
sequence
projectId
hostId
occurredAt
actor
payloadSha256
payload

Operations are appended only after deterministic validation.

Invalid or stale mutations are rejected before entering the authoritative log.

Revision guard

Every task has a monotonically increasing local revision.

Callers may provide:

expectedRevision

If a caller attempts to update stale task state:

TASK_REVISION_CONFLICT expected=X actual=Y

is returned and no operation is appended.

This protects same-filesystem multi-process writers.

Cross-host convergence and remote task operation replication are separate later
phases.

Local concurrency

Task writes use:

openSync(..., 'wx')

with:

* random ownership token,
* PID ownership metadata,
* stale-lock age check,
* live-process check,
* bounded retry,
* ownership-verified release.

The log append is fsynced.

The derived projection is written to a temporary file, fsynced and atomically
renamed.

Crash tail recovery

An interrupted append may leave one incomplete final JSON fragment.

Phase 33 may repair only an unterminated corrupt tail.

An invalid complete JSONL line fails closed.

Durable-data sanitization

Task titles, descriptions, labels, assignee metadata, actor metadata and
operation payloads pass through ToolNet's durable sanitizer before persistence.

Project identity

Task Core uses strict existing-project resolution.

It does not create or initialize a ToolNet project as a side effect.

Garbage collection

.toolnet/tasks/ is protected durable state and is excluded from age-based
garbage collection.

Not included in Phase 33

Phase 33 does not yet add:

* public Task CLI commands,
* MCP Task tools,
* Tasks UI panel,
* automatic progress calculation,
* evidence tracking,
* dependency graph,
* blocker rules,
* automatic completion,
* cross-host Task replication,
* LLM task decomposition.

Those are added incrementally in Phases 34–38.

Runtime architecture

Task Core requires no:

* LLM,
* embedding provider,
* vector database,
* encryption key.
