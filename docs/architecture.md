# ToolNet Memory Architecture

ToolNet Memory is a local-first persistence and continuity layer for AI coding agents.

This document is the top-level architecture map. Phase-specific documents describe implementation history; this page describes the current system.

---

## 1. System overview

```text
┌──────────────────────────────────────────────────────────────┐
│                       Coding Agents                          │
│ OpenCode / Codex / Claude / Kiro / Cursor / Copilot / Grok   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ native events / MCP / CLI
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                     Session Runtime                          │
│                                                              │
│  Provider Adapter                                            │
│       │                                                      │
│       ▼                                                      │
│  Normalized Session Events                                   │
│       │                                                      │
│       ▼                                                      │
│  Session WAL  ───────────── crash-safe durable input         │
└───────────────┬──────────────────────────────────────────────┘
                │
                │ native plan / TODO observations
                ▼
┌──────────────────────────────────────────────────────────────┐
│                    Task Mirror Layer                         │
│                                                              │
│  Native Plan Adapter                                         │
│       │                                                      │
│       ▼                                                      │
│  Mirror Identity                                             │
│       │                                                      │
│       ▼                                                      │
│  Mirror Binding Store                                        │
│       │                                                      │
│       ▼                                                      │
│  Task Mirror Engine                                          │
│       │                                                      │
│       ▼                                                      │
│  Mirror Mutation Executor                                    │
└───────────────┬──────────────────────────────────────────────┘
                │
                │ canonical Task mutations
                ▼
┌──────────────────────────────────────────────────────────────┐
│                    Persistent Task Core                      │
│                                                              │
│  TaskStore                                                   │
│       │                                                      │
│       ├── immutable operation log                            │
│       │     .toolnet/tasks/events.jsonl                      │
│       │                                                      │
│       └── derived projection                                 │
│             .toolnet/tasks/state.json                        │
│                                                              │
│  Task State Engine                                           │
│  Task Handoff Engine                                         │
│  Dependency Scheduler                                        │
│  Orchestration Engine                                        │
│  Parallel Execution Coordinator                              │
│  Completion Snapshot                                         │
│  Auto Evidence                                               │
└──────────┬──────────────────────┬────────────────────────────┘
           │                      │
           │                      │
           ▼                      ▼
┌──────────────────────┐   ┌───────────────────────────────────┐
│ Current Work         │   │ Cross-host Replication            │
│ Projection v2        │   │                                   │
│                      │   │ Immutable operation batches       │
│ Done                 │   │      │                            │
│ Remaining            │   │      ▼                            │
│ Blockers             │   │ Download / Import                 │
│ Files                │   │      │                            │
│ Artifacts            │   │      ▼                            │
│ Verification         │   │ Canonical deterministic merge     │
│ Next Action          │   │      │                            │
└──────────┬───────────┘   │      ▼                            │
           │               │ Converged Task Projection         │
           ▼               └──────────────────┬────────────────┘
 .toolnet/current.md                          │
           │                                  │
           └──────────────┬───────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                      Access Surfaces                         │
│                                                              │
│ CLI                         MCP                              │
│ toolnet-memory task:*       task_list                        │
│                             task_get                         │
│                             task_create                      │
│                             task_update                      │
│                             task_start / block / resume      │
│                             task_complete                    │
│                             task_claim / heartbeat           │
│                             task_handoff                     │
│                             task_next                        │
│                             task_resume_context              │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Source of truth

### Persistent Tasks

The authoritative Task state is the immutable operation history:

```text
.toolnet/tasks/events.jsonl
```

TaskStore replays those operations to derive:

```text
.toolnet/tasks/state.json
```

state.json is a cache/projection. It may be deleted or rebuilt. It is never the authoritative mutation history.

### Session data

The Session WAL is the crash-safe source for normalized provider events. Provider adapters normalize events only. They do not directly own persistent Task state.

### Current Work

.toolnet/current.md is a derived projection. It must never become a second Task database. Current Work is rebuilt from Persistent Tasks first, with legacy Session WorkState used only when Persistent Tasks do not exist.

### Memory

Long-term Memory and Persistent Tasks are separate concepts:

- Memory: rules, decisions, facts, observations, history
- Persistent Tasks: execution state, blockers, progress, dependencies, leases, evidence, artifacts, completion

Task state must not be inferred from old historical Memory when canonical Persistent Tasks exist.

---

## 3. Task mutation path

Manual CLI/MCP mutations follow:

```text
CLI / MCP
   │
   ▼
TaskStore / TaskStateEngine / TaskOrchestrationEngine
   │
   ▼
guard validation
   │
   ▼
immutable TaskOperation
   │
   ▼
fsync append to events.jsonl
   │
   ▼
projection rebuild
   │
   ▼
atomic state.json write
```

Task lifecycle, revision, dependency and lease guards remain centralized. CLI and MCP must not bypass TaskStore by editing Task files directly.

---

## 4. Native Task Mirror

Coding agents may maintain their own TODO/plan representations. ToolNet converts those provider-native events into canonical Persistent Tasks:

```text
Provider native plan
      │
      ▼
Native Plan Adapter
      │
      ▼
normalized mirror observation
      │
      ▼
Mirror Identity
      │
      ▼
Mirror Binding
      │
      ▼
Task Mirror Engine
      │
      ▼
Task Mutation Executor
      │
      ▼
TaskStore
```

Mirror Binding preserves stable identity between:

- provider
- native session/plan
- external item/source key
- canonical ToolNet Task

Provider adapters are not allowed to write TaskStore independently. This avoids provider-specific Task semantics.

---

## 5. Crash recovery

The Task architecture uses write-ahead durability.

Session path:

```text
normalized event
      │
      ▼
Session WAL fsync
      │
      ▼
Task Mirror enqueue
```

If a process crashes after WAL persistence but before mirror execution, self-healing replays WAL events into the Task Mirror.

Task projection recovery:

```text
events.jsonl
      │
      ▼
TaskStore.rebuildProjection()
      │
      ▼
state.json
```

A partial unterminated Task operation tail may be repaired. A complete corrupt operation line fails closed.

---

## 6. Cross-host replication

Each host authors immutable Task operations under its own hostId. Host-local sequence values are not globally unique. Identity is based on:

```text
hostId + operationId
```

Replication flow:

```text
Host A local log
      │
      ▼
immutable replication batch
      │
      ▼
shared storage
      │
      ├──────────────► Host B import
      │
      └──────────────► Host C import
                             │
                             ▼
                    deterministic convergence
```

No distributed lock is required. Each host computes the same projection from the same operation set.

---

## 7. Canonical replication ordering

occurredAt is metadata only. It is NOT a global ordering clock.

Canonical ordering uses:

1. Preserve each host's local sequence.
2. Consider the next unconsumed operation from each host.
3. Prefer operations whose referenced Task/parent is already known.
4. Prefer task.created when creation must establish identity first.
5. Resolve remaining ties using:

```text
hostId
sequence
operationId
payloadSha256
```

This deliberately avoids relying on synchronized wall clocks.

---

## 8. Replication conflicts

Conflicts are surfaced instead of silently rewriting authored history.

Examples:

```text
TASK_REPLICATION_OPERATION_COLLISION
TASK_LIFECYCLE_CONFLICT
TASK_LEASE_CONFLICT
TASK_COMPLETION_CONFLICT
TASK_REPLICATION_GUARD_REJECTED
TASK_REPLICATION_ORDER_CONFLICT
```

TASK_REPLICATION_ORDER_CONFLICT means:

1. The operation was valid enough to enter the replication set.
2. Canonical ordering selected it.
3. Applying it to the projection violated a Task guard.
4. The authored operation remains in immutable history.
5. It is excluded from the effective projection for that replay.

Debug with:

```bash
toolnet-memory task:conflicts --explain
```

Optional filtering:

```bash
toolnet-memory task:conflicts --explain --task TASK_ID
```

Important: the explanation path observes the same canonical ordering code. It does not implement a second merge algorithm.

---

## 9. Lease and orchestration

An active Task may have an execution lease. Leases provide execution ownership, not distributed database locking.

```text
claim
  │
  ▼
active lease
  │
  ├── heartbeat
  │
  ├── release
  │
  └── handoff
```

Scheduler and orchestration use canonical Task projection plus lease/conflict state to determine whether work is:

- owned
- handoff
- recoverable
- recommended
- none

---

## 10. Artifact evidence

Production/SEO artifacts are stored as structured Task evidence.

Example lifecycle:

```text
planned
   │
   ▼
executed
   │
   ▼
verified
```

executed exit=0 is not equivalent to verified. The immutable Task evidence history preserves all states while Current Work renders only the newest logical state for the same artifact key.

---

## 11. MCP boundary

MCP is an API surface over the same Task engines used by CLI. Task MCP tools instantiate:

```text
TaskStore
TaskStateEngine
TaskHandoffEngine
TaskOrchestrationEngine
```

Therefore MCP agents receive the same:

- revision guards
- lifecycle guards
- dependency rules
- lease rules
- completion guards

Agents must not reconstruct Persistent Tasks by reading .toolnet/tasks/events.jsonl or state.json directly.

---

## 12. CLI boundary

CLI Task commands route through:

```text
bin/toolnet-memory
      │
      ▼
bundle/task-cli.js
      │
      ▼
src/tasks/cli.ts
      │
      ▼
ProjectTaskService / TaskStore / engines
```

Useful replication commands:

```bash
toolnet-memory task:sync
toolnet-memory task:sync --push
toolnet-memory task:sync --pull
toolnet-memory task:conflicts
toolnet-memory task:conflicts --explain
toolnet-memory task:conflict-resolve TASK_ID ...
```

---

## 13. Derived state rule

The architecture follows one central rule:

> Durable facts are authoritative; convenient summaries are projections.

Authoritative:

- Session WAL
- Task operation logs
- Replication batches
- Canonical Memory operations

Derived/rebuildable:

- Task state.json
- Current Work
- startup context
- status summaries
- doctor summaries

Deleting a derived projection must not destroy durable execution history.

---

## 14. Multi-host correctness invariant

For the same complete immutable operation set:

```text
Projection(host A)
==
Projection(host B)
==
Projection(host C)
```

And after derived state deletion/restart:

```text
Replay(local operations + replicated operations)
==
previous converged projection
```

Phase 58B certifies this with real 3-host divergence/convergence tests.

---

## 15. Important implementation files

### Task Core

```text
src/tasks/types.ts
src/tasks/store.ts
src/tasks/projection.ts
src/tasks/state-engine.ts
src/tasks/orchestration-engine.ts
src/tasks/dependency-scheduler.ts
src/tasks/parallel-execution.ts
```

### Mirror

```text
src/tasks/mirror-engine.ts
src/tasks/mirror-binding-store.ts
src/tasks/mirror-identity.ts
src/tasks/mirror-mutation-executor.ts
src/session/native-plan/
src/session/task-self-healing.ts
```

### Replication

```text
src/tasks/replication/core.ts
src/tasks/replication/service.ts
src/tasks/replication/upload.ts
src/tasks/replication/download.ts
src/tasks/replication/store.ts
```

### Current Work / Memory Quality

```text
src/work-continuity/current-work-projection.ts
src/work-continuity/context-noise-filter.ts
src/memory/scope-freshness.ts
src/memory/quality.ts
```

### MCP / CLI

```text
src/tasks/cli.ts
src/mcp/server.ts
src/mcp/tools/task-tools.ts
bin/toolnet-memory
```

---

## 16. Design constraints

ToolNet Persistent Tasks intentionally do not use:

- distributed locks
- provider-specific Task databases
- wall-clock last-write-wins
- raw session history as execution authority
- Current Work as a mutable Task database
- automatic deletion of stale Memory

The design favors:

- append-only operations
- deterministic replay
- local-first mutation
- cross-host convergence
- fail-closed guards
- explicit conflict visibility
- rebuildable projections
- bounded context

---

## 17. Intent-Aware Retrieval Router

Starting with Phase 59, `toolnet-memory ask` does not query every
continuity source for every question.

The question is classified before retrieval:

```text
Question
   │
   ▼
Intent Router
   │
   ├── current work ─────► Persistent Tasks
   │
   ├── artifact ─────────► Task Artifact Evidence
   │
   ├── rules ────────────► verified/fresh canonical Memory
   │
   ├── recent state ─────► fresh high-confidence Memory
   │
   ├── decisions ────────► Decision Memory
   │
   ├── code ─────────────► persisted Code Intelligence / SQLite FTS5
   │
   ├── history ──────────► deep canonical Memory
   │
   └── continuity ───────► compact legacy continuity fallback
   │
   ▼
Minimal deterministic answer
```

Routing is local and deterministic. No LLM is required.

Sources are lazy. A source is not read unless the route selects it or a
higher-priority source returned no usable result.

Examples:

- "task hiện tại là gì?" -> Persistent Tasks
- "deploy production chạy chưa?" -> Task Artifact Evidence
- "quy tắc deploy là gì?" -> canonical Rule Memory
- "vì sao chọn append-only operation log?" -> Decision Memory
- "TaskStore được định nghĩa ở đâu?" -> persisted Code Intelligence
- "trước đây đã làm gì với replication?" -> historical canonical Memory

For code questions the router uses persisted code chunks and the existing
SQLite FTS5/BM25 engine. It does not trigger a full repository re-index.

For historical questions stale Memory is intentionally searchable because the
user explicitly requested history. Stale history remains excluded from normal
current-work startup context.

Debug routing without creating another top-level command:

```bash
toolnet-memory ask --debug-route "deploy production đã verified chưa?"
```

Structured output:

```bash
toolnet-memory ask --json "TaskStore được định nghĩa ở đâu?"
```

The central invariant remains:

- current execution truth -> Persistent Tasks
- durable knowledge -> canonical Memory
- code structure -> Code Intelligence
- production evidence -> Task Artifact Evidence

---

## 18. Composite Retrieval Planner

Phase 59 routes one intent to one primary source.

Phase 60 adds a bounded planning layer for questions containing multiple
independent intents.

```text
Question
   │
   ▼
Clause / Intent Detection
   │
   ▼
Composite Retrieval Plan
   │
   ├── Current Work ───────► Persistent Tasks
   │
   ├── Artifact State ─────► Task Artifact Evidence
   │
   ├── Code Location ──────► Code Intelligence
   │
   └── Decision / Rule ────► Canonical Memory
   │
   ▼
Maximum 3 distinct sources
   │
   ▼
Phase 59 source executors
   │
   ▼
Authority-aware merge
   │
   ▼
Compact answer + provenance
```

Single-intent questions are delegated directly to the Phase 59 engine, so
Phase 60 does not replace the existing deterministic router.

Composite mode deliberately disables per-step fallback expansion. This keeps
the three-source budget real and prevents accidental full fan-out.

Source authority for merged execution context is:

```text
Persistent Tasks
      >
Task Artifact Evidence
      >
Code Intelligence
      >
Canonical Memory
      >
Legacy Continuity
```

Code Intelligence is structurally orthogonal to Task state, but it is rendered
before Memory because repository evidence should be inspected before historical
knowledge when both are requested.

For production execution state, Task Artifact Evidence is authoritative over
Memory.

Example conflict:

```text
Artifact Evidence:
  [executed] deploy
Memory:
  "Production deploy is verified"
Result:
  MEMORY_TASK_STATE_CONFLICT
Authority:
  task-artifacts
```

Memory is not deleted or rewritten. The conflict is surfaced in the answer and
the canonical Task Artifact state remains authoritative.

Example:

```bash
toolnet-memory ask --debug-route \
  "Task hiện tại là gì, deploy production đã verified chưa và TaskStore nằm ở đâu?"
```

The planner may produce:

```text
current_work -> persistent-tasks
artifact     -> task-artifacts
code         -> code-intelligence
```

No canonical Memory query is performed in that case.

The central Phase 60 invariant is:

```text
single intent
    -> Phase 59 exactly
multi intent
    -> only explicitly required sources
    -> maximum 3 distinct sources
    -> no full fan-out
```
