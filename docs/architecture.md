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

### Durable Memory Policy

```text
src/memory/promotion-policy.ts    # canonical policy owner
src/session/learner/extractor.ts  # durable knowledge kinds
src/memory/conflict-detector.ts   # contradiction and supersession
src/memory/decay.ts
src/memory/lifecycle.ts
```

Exactly one policy decides what ToolNet remembers. Every automatic capture and
every explicit `memory_save` call passes through `evaluateMemoryPolicy`, which
returns a deterministic decision plus a reason code:

- accepted: `accepted_project_rule`, `accepted_requirement`,
  `accepted_architecture_decision`, `accepted_decision`, `accepted_root_cause`,
  `accepted_verified_fix`, `accepted_deployment`, `accepted_blocker`,
  `accepted_handoff`, ...
- rejected: `rejected_empty`, `rejected_too_large`, `rejected_secret`,
  `rejected_speculative`, `rejected_transient`, `rejected_low_confidence`,
  `rejected_scope`

Policy behaviour:

- Automatic capture is always project scope. A single session can never promote
  global memory; a global request is refused rather than silently downgraded.
- Secrets are rejected before anything reaches the learned journal, and an
  explicit save never bypasses that gate.
- Hedged conclusions (`probably`, `maybe`, `I think`) are never durable. A root
  cause additionally requires user, source or test verification.
- Contradiction is structured, not fuzzy: same class plus the same `subject`
  means the newer value supersedes the older, while a different subject stays a
  separate fact.
- A lasting requirement is never superseded by the bug that currently violates
  it, and deployment facts keep only the current version.
- Superseded memory is hidden from default search and returned only through
  explicit historical retrieval (`includeSuperseded`).
- Stale temporal facts are flagged, never deleted.

The authoritative per-type table is produced by `memoryKnowledgeClassMatrix()`
and certified by `certifyMemoryQualityGA()`. It is derived from the policy, never
hand-maintained. Timeless knowledge (project rules, adopted requirements and
architecture decisions) never goes stale by age; task-scoped knowledge
(decisions, fixes, deployments, blockers, root causes, handoffs) goes stale
after 30 days, and session-scoped knowledge (facts, preferences, operational
references) after 14.

Durable memory quality (`src/memory/quality.ts`) is inspected separately from
capture and materialization health
(`src/production/memory-pipeline-status.ts`). A healthy pipeline can hold no
durable knowledge, and a broken pipeline says nothing about memory quality.

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

---

## 19. Retrieval Quality Evaluation

Phase 61 adds a deterministic quality gate around the Phase 59 router and
Phase 60 Composite Retrieval Planner.
Routing quality is evaluated against a fixed bilingual benchmark rather than
being inferred from unit tests alone.

```text
Fixed benchmark
      │
      ▼
Phase 59 / Phase 60 planner
      │
      ▼
Expected vs predicted
      │
      ├── mode
      ├── intents
      ├── sources
      ├── omitted intents
      └── source budget
      │
      ▼
Precision / Recall / F1
      │
      ▼
Regression quality gate

The benchmark covers:

Vietnamese + English
single intent + composite intent
current work
artifact state
rules
decisions
recent state
history
continuity
code intelligence
three-source planning
source-budget omission

Important metrics:

exact case accuracy
mode accuracy
intent precision / recall / F1
source precision / recall / F1
unnecessary source reads
missing source reads
source-budget violations
average planned sources
maximum planned sources

Actual retrieval results can also be measured for:

attempted sources
successful fragments
answer characters
estimated tokens
provenance coverage
conflict count

The evaluator is deterministic and does not call an LLM.

Run:

npm run retrieval:eval

Strict certification:

npm run retrieval:eval -- --strict

Machine-readable report:

npm run retrieval:eval -- --json

Routing explainability remains on the existing ask command:

toolnet-memory ask --debug-route \
  "task hiện tại là gì và deploy production verified chưa?"

The debug output includes:

mode
source budget
every planned intent
source selected by each step
authority
route confidence
route reasons
attempted sources
answer character cost
estimated token cost
provenance coverage
conflicts

The benchmark is external ground truth. It must not be generated dynamically
from router implementation rules, otherwise routing regressions could make both
the implementation and its expected answers wrong at the same time.
```

---

## 20. Retrieval Production Certification

Phase 62 moves retrieval quality from a development benchmark into the
production release contract.
The Phase 61 benchmark remains unchanged as historical ground truth.
Phase 62 adds an adversarial layer:

```text
Phase 61 fixed benchmark
        29 cases
           │
           ▼
Phase 62 adversarial cases
        36 cases
           │
           ▼
      65 total cases

Adversarial categories include:

paraphrase
negation
ambiguous wording
short questions
punctuation changes
connector changes
same-source composite queries
three-source queries
four-intent source-budget pressure

A release must satisfy:

exact case accuracy = 1.0
mode accuracy       = 1.0
intent F1           = 1.0
source F1           = 1.0
unnecessary reads   = 0
missing reads       = 0
budget violations   = 0

The production certification path is now:

production:certify
      │
      ├── package/runtime checks
      ├── cross-agent continuity
      ├── crash recovery
      ├── Memory Quality GA
      │
      ├── Phase 62 retrieval benchmark
      │       │
      │       └── 65 fixed deterministic cases
      │
      └── Packaged ask smoke
              │
              ▼
      bin/toolnet-memory
              │
              ▼
      bundle/memory-query.js
              │
              ▼
      Phase 60 Composite Planner
              │
              ▼
      Phase 59 Intent Router

The packaged CLI smoke test deliberately creates a temporary production package
without src/.

It verifies both:

single:
  "task hiện tại là gì?"
  -> persistent-tasks
composite:
  "task hiện tại là gì và deploy production verified chưa?"
  -> persistent-tasks
  -> task-artifacts

The smoke questions only require local Task/Artifact routing. This proves that
local retrieval does not accidentally initialize remote Memory storage.

bundle/memory-query.js is now part of the required npm production package
contract.

Retrieval regressions therefore block production:certify, which in turn blocks
release publication.

No public benchmark command is added. Development evaluation remains:

npm run retrieval:eval
npm run retrieval:eval -- --strict
```

---

## 21. Real-world Retrieval Telemetry

Phase 63 adds local runtime telemetry for the Phase 59/60 retrieval system.
The purpose is to measure whether benchmark quality also holds during real
project usage.

```text
toolnet-memory ask / MCP memory_agent_ask
                    │
                    ▼
          Retrieval Planner
                    │
                    ▼
             Retrieval Result
                    │
             ┌──────┴──────┐
             ▼             ▼
          Answer      Local telemetry
                           │
                           ▼
          .toolnet/retrieval/telemetry.jsonl

Telemetry is diagnostic only.

It is not a source of execution truth, Memory truth, or Task truth.

Privacy contract

Telemetry stores structural metrics only:

timestamp
surface: cli | mcp
outcome
latency
mode
intent names
planned source names
attempted source names
selected source
omitted intent names
route confidence
result count
answer character count
estimated token count
provenance coverage
conflict codes
source-budget violation
safe machine error code

Telemetry NEVER stores:

question text
answer text
prompts
file paths
Task IDs
Memory contents
source references
user content

No query hash is stored either.

A hash of user text can still leak information through dictionary attacks, so
Phase 63 intentionally does not fingerprint questions.

Local only

Telemetry lives under:

.toolnet/retrieval/telemetry.jsonl

It is not uploaded through Memory storage and is not part of Task replication.

Directory/file permissions are hardened to 0700 / 0600 where supported.

Telemetry may be disabled:

TOOLNET_RETRIEVAL_TELEMETRY=0

Retrieval behavior is unchanged when telemetry is disabled or when telemetry
writing fails.

Bounded retention

Telemetry is non-authoritative and may be compacted.

Default bounds:

max file size before compaction: 2 MiB
retained events:                5000

This prevents long-running projects from accumulating an unbounded telemetry
log.

Operational metrics

Phase 63 measures:

query count
success / no-result / error
single vs composite ratio
average latency
p95 latency
average estimated tokens
average attempted sources
average provenance coverage
conflict events
source-budget violations
source distribution
intent distribution
CLI vs MCP distribution

The existing toolnet-memory status command shows a compact 7-day summary.

Development/admin detail:

npm run retrieval:telemetry
npm run retrieval:telemetry -- \
  --hours 24
npm run retrieval:telemetry -- \
  --json

No new public toolnet-memory command is introduced.

Production certification

The packaged ask smoke test now verifies that the real production binary:

bin/toolnet-memory
      │
      ▼
bundle/memory-query.js

creates local telemetry for single and composite retrieval while never writing
the question or answer into the telemetry file.

Phase 63 adds the release-blocking production check:

phase63-retrieval-telemetry

The telemetry system remains fail-soft:

retrieval success
    must never depend on
telemetry success
```

---

## 22. Feedback and Guarded Adaptive Routing

Phase 64 adds explicit feedback without turning retrieval into a nondeterministic
self-learning system.

```text
Baseline Phase 59 route
        │
        ▼
Explicit correction
        │
        ▼
Structural route signature
        │
        ▼
Local feedback votes
        │
        ▼
minimum support = 3
minimum agreement = 80%
        │
        ▼
Candidate override
        │
        ▼
Phase 62 65-case benchmark
        │
   ┌────┴────┐
   ▼         ▼
 PASS       FAIL
   │         │
activate    reject
locally     candidate

Feedback privacy

Feedback does not persist the user question.

It also does not persist a question hash.

The persisted signature is built only from deterministic classifier structure:

predicted intent
+
static route reason codes

Example:

recent_state|recent-explicit+recent-fact

It is not:

SHA256(question)

and it contains no raw query text.

Feedback files:

.toolnet/retrieval/feedback.jsonl
.toolnet/retrieval/overrides.json

Both are local project state and are not uploaded through canonical Memory or
Task replication.

Promotion guard

One correction is not enough to modify routing.

Default promotion requirements:

support >= 3
agreement >= 0.80
Phase 62 benchmark = 65/65 PASS
intent F1 = 1.0
source F1 = 1.0
extra reads = 0
missing reads = 0
budget violations = 0

If an adaptive rule would break one fixed benchmark case, the complete new
candidate override set is rejected.

Previously approved rules remain active.

Runtime path

question
   │
   ├── baseline planner
   │       └── used for feedback evaluation
   │
   ▼
load local approved overrides
   │
   ▼
Phase 59 route
   │
   ▼
exact structural signature match
   │
   ├── no rule ──► original deterministic route
   │
   └── approved rule
             │
             ▼
       corrected intent
             │
             ▼
       Phase 60 planner

Adaptive matching is exact on structural route signatures.

It does not use embeddings, fuzzy query matching, user-text fingerprinting, or
an LLM.

Explicit feedback

Existing CLI:

toolnet-memory ask \
  --feedback-intent artifact \
  "QUESTION"

The answer is still produced normally.

The feedback applies to the baseline single-intent route and affects subsequent
queries only after promotion requirements pass.

For MCP, memory_agent_ask accepts:

feedbackIntent

with the same intent values used by the deterministic router.

Composite questions are intentionally not corrected through one
feedbackIntent, because a multi-intent plan cannot be safely represented by a
single expected intent.

Administration

Local feedback summary:

npm run retrieval:feedback

Force candidate recompilation:

npm run retrieval:feedback -- --refresh

JSON:

npm run retrieval:feedback -- --json

The existing toolnet-memory status command reports the number of local
feedback events and active adaptive rules.

Authority

Adaptive feedback may change retrieval routing.

It may not change:

Persistent Task state
Artifact state
Memory contents
Task authority ordering
replication rules
source authority ordering

Feedback decides where to look.

It does not decide what is true.

Production certification

Phase 64 production certification proves:

safe structural rule -> promoted
approved rule         -> applied
benchmark-breaking rule -> rejected
previous safe rule    -> preserved
question text         -> absent
query hash            -> absent

The release-blocking check is:

phase64-adaptive-retrieval
```

---

## 23. Retrieval GA

Phase 65 closes the Retrieval roadmap introduced in Phase 59.

```text
Phase 59 — Intent-Aware Retrieval Router
                │
Phase 60 — Composite Retrieval Planner
                │
Phase 61 — Retrieval Quality Evaluation
                │
Phase 62 — Hardened Production Certification
                │
Phase 63 — Privacy-safe Runtime Telemetry
                │
Phase 64 — Benchmark-gated Adaptive Routing
                │
Phase 65 — Retrieval GA

The GA architecture is:

Question
   │
   ▼
Baseline deterministic classifier
   │
   ▼
Approved local adaptive overrides
   │
   ▼
Composite Retrieval Planner
   │
   ├── Persistent Tasks
   ├── Task Artifact Evidence
   ├── Code Intelligence
   ├── Canonical Memory
   └── Legacy Continuity
   │
   ▼
Authority-aware bounded merge
   │
   ▼
Answer + provenance
   │
   └── privacy-safe local telemetry

Final authority remains:

Persistent Tasks
      >
Task Artifact Evidence
      >
Code Intelligence
      >
Canonical Memory
      >
Legacy Continuity

Adaptive routing changes where ToolNet looks.

It does not change what is authoritative.

GA production requirements:

65 / 65 hardened benchmark cases
exact accuracy = 1.0
intent F1 = 1.0
source F1 = 1.0
unnecessary reads = 0
missing reads = 0
source-budget violations = 0
CLI production smoke = PASS
MCP end-to-end = PASS
telemetry privacy = PASS
adaptive promotion = PASS
bad adaptive override rejection = PASS
production package contract = PASS

The Retrieval runtime requires:

LLM        no
embeddings no
vector DB  no
network    no for local retrieval

Release publication is guarded by:

npm test
      │
      ▼
build:release
      │
      ▼
bundle/production-certify.js
      │
      ▼
npm pack
      │
      ▼
npm publish

A failed Retrieval GA check therefore prevents npm publication.

Phase 65 closes the Phase 59-65 Retrieval roadmap.
```

---

## 24. Post-GA Lifecycle & Drift Control

Phase 66 adds lifecycle management for the post-GA runtime without
changing what is authoritative.

Canonical Memory is read-only here:

- Memory is only inspected and classified.
- There is NO automatic canonical Memory deletion or tombstone.
- Stale non-rule Memory becomes an archive candidate.
- Long-term rules are always protected; a stale rule means
  "verify this rule", never "delete it".

What can be decayed / repaired safely:

- Adaptive routing rules (local, advisory)
- Retrieval telemetry (local, diagnostic)

### Memory lifecycle

```text
MemoryRecord
   │
   ▼
freshness inspection
   │
   ├── fresh
   ├── needs-verification
   └── stale
          │
          ├── scope = rule  → protected (verify only)
          └── scope ≠ rule  → archive candidate (>= 90 days)
```

### Adaptive rule lifecycle

```text
rule activated
   │
   ▼
30 days  → re-certification warning
   │
   ▼
90 days  → expiry (no confirmation for 90 days)
   │
   ▼
maintenance removes expired rules
   │
   ▼
remaining rules re-certified against 65-case benchmark
   │
   ├── PASS → kept
   └── FAIL → individual rollback, else fail closed to baseline
```

- Feedback window: 90 days (older corrections no longer count).
- Expired rules are removed from `overrides.json`.
- Rules are re-certified against the Phase 62 65-case production
  benchmark; any set that breaks the benchmark is rolled back —
  one rule at a time, then fail-closed to the deterministic
  Phase 59/60 baseline.

### Telemetry lifecycle

- 30-day age retention (default).
- Existing 5000-event / 2 MiB bounds preserved.
- Malformed JSONL lines are repaired (discarded).
- Fail-soft: retrieval success never depends on maintenance.

### Drift health

```text
Memory freshness
Memory projection conflicts
invalid multi-host keys
adaptive benchmark drift
telemetry corruption / oversize
```

Soft health signals:

```text
Memory stale/verification state
stale long-term rules
old non-rule archive candidates
Memory projection conflicts
invalid multi-host Memory keys
expired adaptive rules
adaptive benchmark regression
telemetry malformed records
telemetry retention drift
```

Hard health failures are limited to integrity failures:

```text
Memory projection conflicts
invalid projection keys
malformed telemetry
adaptive benchmark regression
```

A stale Memory record itself is not corruption.

### Maintenance surfaces

Read-only:

```text
npm run lifecycle:inspect
```

Local maintenance:

```text
npm run lifecycle:maintain
```

JSON:

```text
npm run lifecycle:inspect -- --json
npm run lifecycle:maintain -- --json
```

Maintenance may modify only:

```text
.toolnet/retrieval/telemetry.jsonl
.toolnet/retrieval/feedback.jsonl
.toolnet/retrieval/overrides.json
```

It does not delete or rewrite canonical Memory.

### Doctor and status

`toolnet-memory doctor` now exposes Lifecycle & Drift health.
`toolnet-memory status` exposes a compact Lifecycle/Drift line.

### Production certification

Phase 66 adds `phase66-lifecycle-drift`. The certification proves:

```text
stale rules remain protected
old observations become archive candidates
canonical Memory is untouched
old telemetry is removed
malformed telemetry is repaired
telemetry remains bounded
expired adaptive rules disappear
65-case benchmark remains green
projection conflicts are detected
```

---

## 25. Backup, Restore and Disaster Recovery

Phase 67 adds a disaster-recovery layer above the existing snapshot system.

The legacy SnapshotManager remains useful for compatibility snapshots, but a
complete recovery point must also include the newer append-only authority
layers introduced after Persistent Tasks and multi-host Memory.

### Source-of-truth backup

Local:

```text
.toolnet/tasks/events.jsonl
.toolnet/tasks/replication/replicated/**
.toolnet/runtime/sources/**/events.jsonl
.toolnet/retrieval/feedback.jsonl
.toolnet/retrieval/overrides.json
.toolnet/retrieval/telemetry.jsonl
```

Remote:

```text
projects/<project>/**
```

excluding historical snapshot trees.

This includes immutable multi-host Memory operations and Task replication
objects.

### Not backed up as authority

```text
.toolnet/tasks/state.json
.toolnet/tasks/replication/cursor.json
.toolnet/journal/**
.toolnet/runtime/locks/**
```

These are rebuilt or reset after restore.

### Recovery package

Default recovery location is outside the project:

```text
~/.toolnet-memory/recovery/<project-id>/<backup-id>/
```

A recovery package contains:

```text
manifest.json
manifest.sha256
local/**
remote/*.bin
```

Every local file and remote object has an individual SHA-256 digest.

The manifest itself also has a SHA-256 digest.

### Restore policy

Restore is dry-run by default.

```text
verify
  │
  ▼
dry-run
  │
  ▼
--apply
  │
  ▼
mandatory pre-restore safety backup
  │
  ▼
restore authoritative files
  │
  ├── rebuild Task projection
  ├── rebuild shared session journal
  ├── reset derived cursors/locks
  └── re-certify adaptive routing
```

There is deliberately no `--no-safety` option.

### Remote recovery

Remote restoration is additive.

```text
backup immutable operations
         +
current remote operations created after backup
         =
converged state
```

Phase 67 never deletes remote objects during restore.

Therefore newer immutable Memory/Task operations that appeared after a backup
are not destroyed by recovery.

### Integrity

A backup must pass all checks before restore:

```text
project id match
manifest SHA-256
every local file SHA-256
every remote blob SHA-256
```

A single mismatch blocks restore.

### Commands

Create complete recovery point:

```bash
npm run recovery:backup
```

Local-only during remote outage:

```bash
npm run recovery:backup -- --local-only
```

Custom reason:

```bash
npm run recovery:backup -- \
  --reason "before production migration"
```

List:

```bash
npm run recovery:list
```

Verify:

```bash
npm run recovery:verify -- BACKUP_ID
```

Restore dry-run:

```bash
npm run recovery:restore -- BACKUP_ID
```

Apply:

```bash
npm run recovery:restore -- \
  BACKUP_ID \
  --apply
```

Custom external backup disk:

```bash
npm run recovery:backup -- \
  --root /mnt/backups/toolnet-memory
```

Environment equivalent:

```bash
TOOLNET_RECOVERY_ROOT=/mnt/backups/toolnet-memory
```

### Disaster drill certification

Phase 67 certification simulates:

```text
Task operation log created
Session WAL created
Remote Memory objects created
        │
        ▼
backup
        │
        ├── corrupt Task state
        ├── delete source WAL
        ├── corrupt remote projection
        └── add newer immutable remote object
        │
        ▼
restore
        │
        ├── Task restored
        ├── Task projection rebuilt
        ├── WAL restored
        ├── shared journal rebuilt
        ├── remote state repaired
        └── newer remote object preserved
```

It separately modifies one backup blob and verifies that restore integrity
validation detects the tampering.

The production release gate is:

```text
phase67-disaster-recovery
```

---

## 26. Phase 68 — Graph Coverage & Trust Contract

Phase 68 adds a deterministic coverage layer over the code graph so ToolNet
can distinguish "no result because nothing exists" from "no result because the
graph is incomplete, stale or unavailable".

It does NOT add a parser. It reuses the existing RepositoryScanStats,
parse failures, parser capabilities and the incremental CodeManifest
(per-file SHA-256) with `diffManifest()` for freshness.

### No fake confidence

ToolNet is deterministic. There are no confidence scores (0.72, 85%, ...).
Trust is expressed through explicit state and evidence:

```text
status            complete | partial | stale | unavailable
negativeClaimSafe true | false
reasons           CoverageReasonCode[]
```

### Capability-specific coverage

Coverage is per-capability, never one global boolean:

```text
lexical_search     SQLite FTS5/BM25 searchability of in-scope files
symbol_graph       symbol extraction completeness
call_graph         call-edge completeness
impact_analysis    reverse-dependency reachability
architecture       module/architecture extraction
dependency_graph   import/dependency edge completeness
```

`lexical_search: complete` never implies `call_graph: complete`.

Python / Go / Rust / C / C++ are structurally unsupported today:

```text
lexical_search   -> complete (when no in-scope parse/skip problems)
call_graph       -> partial, negativeClaimSafe=false, LEXICAL_ONLY_LANGUAGE
dependency_graph -> partial, negativeClaimSafe=false, LEXICAL_ONLY_LANGUAGE
```

### negativeClaimSafe

```text
NO RESULT + coverage complete      -> negative claim can be trusted
NO RESULT + coverage partial       -> must not claim "does not exist"
NO RESULT + coverage stale         -> must not claim "does not exist"
NO RESULT + coverage unavailable   -> must not claim "does not exist"
```

Positive query evidence remains valid under partial coverage; coverage only
means the graph may be missing additional results.

### Freshness

Freshness reuses the existing CodeManifest and `diffManifest()`:

```text
current scan + hash
        |
        v
diffManifest(previous, current)
        |
        +-- added    -> SOURCE_ADDED_AFTER_INDEX
        +-- modified -> SOURCE_MODIFIED_AFTER_INDEX
        +-- deleted  -> SOURCE_DELETED_AFTER_INDEX
        |
        v
stale -> negativeClaimSafe=false
```

Freshness verification only runs when a query wants to make a negative
claim, or when `check_index_coverage` requests it. Positive evidence
attaches lightweight snapshot coverage without hashing the repository.

If the manifest baseline is missing or cannot be built, the check fails
closed to `INDEX_STALE` and negative claims stay blocked.

### Reason codes

```text
INDEX_MISSING                    no graph/index at all
COVERAGE_MISSING                 graph exists, coverage snapshot absent (legacy index)
PARSE_FAILURE                    an in-scope searchable source was rejected
LEXICAL_ONLY_LANGUAGE            in-scope language without structural parser
SKIPPED_OVERSIZED_SOURCE         in-scope source skipped by size limit
SKIPPED_UNREADABLE_SOURCE        in-scope source skipped as unreadable
SOURCE_ADDED_AFTER_INDEX         freshness: file added after index
SOURCE_MODIFIED_AFTER_INDEX      freshness: file modified after index
SOURCE_DELETED_AFTER_INDEX       freshness: file deleted after index
INDEX_STALE                      freshness could not be verified
```

`SKIPPED_SENSITIVE_SOURCE` and `UNSUPPORTED_STRUCTURAL_LANGUAGE` are reserved
reason codes; they are not emitted today (sensitive files and generated
artifacts are excluded by declared scope policy, and every accepted file is
at least lexically searchable).

### Declared indexing scope

Excluded by policy and never partial by themselves:

```text
node_modules/ .git/ .toolnet/ dist/ build/ out/ coverage/
.next/ .nuxt/ .cache/ .parcel-cache/ .turbo/ vendor/ target/
generated bundles (*.min.js, *.bundle.js)
symlinks
sensitive files (.env, credentials, keys)
```

In-scope problems that DO make coverage partial:

```text
parse failures
oversized searchable sources
unreadable searchable sources
```

### Persistence

Coverage is derived state, not authoritative Memory/Task state:

```text
projects/<projectId>/graph/coverage.json
```

It is rebuildable from scan/parse/index metadata and never stores source
content or transcripts. Project isolation is enforced by the storage key.

The production index pipeline writes the coverage snapshot and the
freshness baseline manifest in the same pass as the source index, reusing
the accepted-file scan (no second repository scan).

### MCP behavior

`check_index_coverage` is the dedicated coverage tool:

```text
{
  "capability": "call_graph",          // optional: all capabilities
  "paths": ["src/orders.ts"],       // optional, containment-checked
  "verifyFreshness": true             // safe default
}
```

Negative-sensitive tools (find_callers, trace_calls, graph_dependents,
graph_path, graph_neighborhood, analyze_impact, impact_guard, dead_code)
attach additive `coverage` metadata:

```text
coverage: {
  capability: "call_graph",
  status: "partial",
  negativeClaimSafe: false,
  reasons: ["LEXICAL_ONLY_LANGUAGE"]
}
```

Impact tools additionally report `impactMayBeUnderreported: true` when
coverage is not complete.

`find_symbol` keeps its bare-array shape for backward compatibility; its
empty result means "absent from the indexed structural graph", and agents
are instructed to check coverage before claiming repository-wide absence.

Dead-code candidates remain candidates only. Coverage never becomes a
delete authority: with partial/stale coverage, absence of usage edges is
weaker evidence, never a deletion instruction.

Agent instructions in `TOOLNET_MCP_SERVER_INSTRUCTIONS` require inspecting
coverage before making negative structural claims.

### Non-goals

Phase 68 adds no parser, no LLM, no embeddings, no vector database and no
semantic similarity. Multi-language structural parsing remains Phase 69.

## Phase 69 — Multi-language Structural Parser Foundation

### Parser Architecture

TypeScript / JavaScript: parsed via TypeScript Compiler API.
Python / Go / Rust / C / C++: parsed via tree-sitter adapters.
All supported languages: FTS5/BM25 lexical search remains active.

```
StructuralParserAdapter
       │
       ├── TypeScriptCompilerAdapter
       │
       ├── TreeSitterPythonAdapter
       │
       ├── TreeSitterGoAdapter
       │
       ├── TreeSitterRustAdapter
       │
       ├── TreeSitterCAdapter
       │
       └── TreeSitterCppAdapter
                │
                ▼
        Unified ParsedFile
                │
                ▼
          GraphBuilder
```

### Coverage contract

Phase 69 parses structural syntax. Cross-file semantic resolution remains intentionally conservative and is expanded in Phase 70 — Deterministic Symbol Resolution.

- `lexical_search`: complete when all files lexically searchable, no parse failures.
- `symbol_graph`: complete when all files have a structural parser and no parse failures.
- `call_graph`: partial for tree-sitter languages (cross-file resolution pending Phase 70).
- `dependency_graph`: partial for tree-sitter languages (import resolution limited).

### False-edge protection

Tree-sitter languages only resolve same-file calls in Phase 69. Cross-file CALLS edges are not created unless deterministic resolution is available in Phase 70.

### Parser engine model

```
ParserEngine =
  | 'typescript-compiler-api'
  | 'tree-sitter'
  | 'lexical-only'
  | 'unsupported'
```

A language is only reported as structural when a structural parser is actually
available for it. A missing or corrupt grammar asset makes that language's
parser unavailable; the file falls back to lexical indexing and coverage
records the structural gap. A fallback is never reported as a successful
structural parse.

### Tree-sitter runtime and grammar integrity

Grammars ship as package-owned WASM assets resolved offline from the installed
package. There is no first-run download, no network access during indexing, and
no compiler/package installation triggered by source code.

At runtime initialization each grammar asset is hashed with SHA-256:

- asset present and readable → grammar registered with its SHA-256
- asset missing/corrupt → grammar not registered → parser unavailable

The grammar inventory is deterministic (`verifyGrammarAssets()`).

### Parser fingerprint

Structural graph identity is separate from source identity:

```
Source identity   -> CodeManifest path -> SHA-256 (unchanged)
Parser identity   -> parser fingerprint
Graph generation  -> stored with the graph snapshot
```

The deterministic parser fingerprint is derived from:

- `GRAPH_PARSER_SCHEMA_VERSION` (normalization schema version)
- the registered structural adapter id set
- each grammar asset's SHA-256

No timestamp is used as identity. When the fingerprint changes, a previously
indexed structural graph is treated as invalid even when every source file hash
is unchanged, and the next incremental index performs a full structural
rebuild.

### Parser diagnostics and telemetry

Diagnostics are deterministic, bounded (max 20 per file, `truncated` when
capped) and never contain source content, secrets, environment values, or
stack dumps.

Indexing records local-only per-language parser stats:

```
parserStats[language] = { files, failures, durationMs }
```

### Parser failure semantics

- no syntax errors → structural parse accepted
- recoverable syntax errors → partial AST (`PARTIAL_AST`) → coverage partial
  (`STRUCTURAL_PARSE_FAILED`)
- catastrophic parse / grammar unavailable → lexical fallback for that file →
  coverage partial (`STRUCTURAL_PARSER_UNAVAILABLE`)

One parse failure never removes the lexical index for that file or for the rest
of the repository.

### Coverage integration

Coverage remains the authority for negative claims. Phase 69 only changes what
is structurally available; it does not make structural negative claims safe by
itself. `call_graph` and `dependency_graph` stay `partial`
(`CROSS_FILE_RESOLUTION_PENDING`) for tree-sitter languages until Phase 70.

LSP servers remain detection-only (`activeInStructuralGraph: false`) and are
never the structural graph source of truth.

## Phase 70 — Deterministic Symbol Resolution

### Parsing is not resolution

Phase 69 produced AST facts (`calleeName`, `qualifier`, imports, heritage).
Phase 70 decides which symbol a reference actually points at, and refuses to
decide when the evidence is insufficient.

```
Parsed AST references
        │
        ▼
Symbol / scope indexes
        │
        ▼
Language module resolver
        │
        ▼
Candidate collection (evidence only)
        │
        ├── exactly one proven target  → RESOLVED
        ├── several proven targets     → AMBIGUOUS
        └── no proven target           → UNRESOLVED
```

### Resolution authority

Resolution is deterministic. Every candidate comes from one of:

- `same_lexical_scope` — a binding in the enclosing scope chain
- `explicit_import` — a named/aliased/default import binding
- `module_export` — a proven project-local module/include target
- `namespace_qualification` — a module-qualified call
- `receiver_type` — a declared receiver type's member
- `inheritance_member` — a member reached through a deterministic INHERITS edge

There are no confidence scores, no fuzzy matching, and no heuristic
"best candidate". `ResolutionResult.status` is one of `resolved`,
`ambiguous`, `unresolved`, `unsupported`; reason codes are machine-readable
(`NO_CANDIDATE`, `MULTIPLE_CANDIDATES`, `UNRESOLVED_IMPORT`,
`UNKNOWN_RECEIVER_TYPE`, `EXTERNAL_DEPENDENCY`, `INDIRECT_CALL`,
`DYNAMIC_REFERENCE`, `PARSE_PARTIAL`, `UNSUPPORTED_LANGUAGE_FEATURE`).

### Same name never means same symbol

A call resolves by scope, import, module or receiver evidence — never because a
single symbol with that simple name happens to exist. Qualified references
(`Child::save()`, `repo.save()`, `lib.save()`) are never resolved by matching a
bare same-file name, and import references are never resolved by local name
collision. Unproven targets stay unresolved.

### Per-language module resolution

Each language uses its own resolver — never one language's rules for another:

| Language                | Project-local resolution                                       |
| ----------------------- | -------------------------------------------------------------- |
| TypeScript / JavaScript | relative imports with extension/index mapping                  |
| Python                  | dotted and relative imports, `__init__.py` packages            |
| Go                      | `go.mod` module prefix → package directory                     |
| Rust                    | `crate::`, `self::`, `super::`, `mod x;` → `x.rs` / `x/mod.rs` |
| C / C++                 | `#include "..."` relative to the importer, then project root   |

All resolvers read project files passively and share one cached file inventory
per run. Nothing is installed, compiled or downloaded, and no resolver escapes
the project root.

### CALLS vs CALL_REFERENCE

- `CALLS` — the target symbol was proven deterministically.
- `CALL_REFERENCE` — the declaration/interface target is known but a runtime
  implementation is not proven.

Ambiguous and unresolved references produce no edge of either kind. External
dependencies (stdlib/third-party) are recorded as external, never as fake
project-local edges, and never degrade coverage.

### Generation, fingerprint and staleness

Resolution identity is separate from both source identity and parser identity:

```
resolution generation = schema version
                      + resolver implementation version
                      + module rules version
                      + parser fingerprint (Phase 69)
                      + sorted symbol ids
```

No timestamps. A resolution snapshot computed for another graph generation is
stale — `isResolutionStale()` must be consulted before using persisted
resolution as evidence. Snapshots are derived state, stored per project, never
Memory/Task authority.

### Coverage integration

Phase 68 coverage consumes real resolution evidence. When resolution is
available it supersedes the blanket `CROSS_FILE_RESOLUTION_PENDING` marker:

- unresolved call references → `UNRESOLVED_CALL_REFERENCE`
- ambiguous targets → `AMBIGUOUS_CALL_TARGET`
- unknown receivers → `UNKNOWN_RECEIVER_TYPE`
- indirect calls → `INDIRECT_CALL_TARGET`
- unresolved project-local imports → `UNRESOLVED_IMPORT`

Only the affected capabilities are marked partial: an unresolved call never
degrades `lexical_search`, and external dependencies never degrade anything.
`symbol_graph` completeness still depends on parsing, not on call resolution.

### Non-goals

Phase 70 adds no LLM, embeddings, vector database or semantic similarity, no
runtime traces, no HTTP/service linking and no cross-repository graph. Static
interface/trait/virtual dispatch is never resolved to a concrete
implementation. Known limits: local variable shadowing and deep type inference
are not modelled, so a shadowed name may still resolve through an import; those
cases stay conservative rather than guessed.

---

## Phase 71 — Graph Semantics v2

Phase 71 gives every persisted relationship one explicit, machine-checkable
meaning. A graph edge now answers: what relationship is this, who produced it,
what evidence justifies it, is it static or a reference, and is it fully
deterministic. The authoritative graph contains only deterministic
relationships; heuristic analysis results stay out of it.

```text
Symbol
  |-- DEFINES          structure / declaration
  |-- IMPORTS          resolved module dependency
  |-- CALLS            deterministic static call
  |-- CALL_REFERENCE   call site binds declaration/interface, runtime target unknown
  |-- USES_TYPE        deterministic type usage
  |-- INHERITS         class -> parent class
  |-- IMPLEMENTS       class -> interface/trait
  |-- READS / WRITES   deterministic field/state access
  |-- HANDLES / ROUTE  declared route relationship
  |-- CONFIGURES       declared configuration relationship
```

### Edge registry

`edge-semantic-registry.ts` is the single source of truth. Each edge type
declares its allowed source/target symbol types, whether the target must be
resolved, whether multiple targets are allowed, its category and its _primary
producer_. The validator (`graph-validator.ts`) enforces this compatibility
matrix; nothing else hard-codes edge rules.

| Edge                | Meaning                                             | Primary producer | Evidence             | Source -> Target                                     | Capability         |
| ------------------- | --------------------------------------------------- | ---------------- | -------------------- | ---------------------------------------------------- | ------------------ |
| `DEFINES`           | container/declaration containment                   | parser           | syntax               | file/module/class/namespace -> symbol                | `symbol_graph`     |
| `IMPORTS`           | resolved module dependency                          | parser           | explicit import      | file/module -> file/module                           | `dependency_graph` |
| `CALLS`             | deterministic static call                           | resolver         | resolved symbol      | function/method/class/route -> callable              | `call_graph`       |
| `CALL_REFERENCE`    | call site binds declaration, runtime target unknown | resolver         | resolved declaration | function/method/class/route -> interface/declaration | `call_graph`       |
| `USES_TYPE`         | deterministic type usage                            | enricher         | resolved symbol      | symbol -> class/interface/type/struct/enum           | `dependency_graph` |
| `INHERITS`          | class inherits parent class                         | parser           | syntax + resolution  | class -> class/interface                             | `dependency_graph` |
| `IMPLEMENTS`        | class implements interface/trait                    | parser           | syntax + resolution  | class -> interface/trait                             | `dependency_graph` |
| `READS`             | deterministic field/state read                      | enricher         | resolved symbol      | function/method/class -> field/variable              | `impact_analysis`  |
| `WRITES`            | deterministic field/state write                     | enricher         | resolved symbol      | function/method/class -> field/variable              | `impact_analysis`  |
| `HANDLES` / `ROUTE` | declared route relationship                         | enricher         | declaration          | function/route -> route/handler                      | `impact_analysis`  |
| `CONFIGURES`        | declared configuration relationship                 | analysis         | declaration          | symbol -> symbol                                     | `impact_analysis`  |

The edge set also retains `TESTS` and `HTTP_CALLS`. Language detail never
creates a language-specific edge type: `extends`, `class A(B)` and
`class A : public B` all normalize to `INHERITS`; `implements` and
`impl Trait for Type` normalize to `IMPLEMENTS`.

### CALLS is not CALL_REFERENCE

`CALLS` requires a deterministic callee identity. `CALL_REFERENCE` records a
call site whose declaration/interface is known but whose runtime concrete
implementation is not — interface, trait and virtual dispatch. A
`CALL_REFERENCE` is never silently promoted to `CALLS`, and Go interface
implementations are not inferred from matching method sets.

### Provenance and identity

Every edge carries `origin` (`parser` | `resolver` | `enricher` | `analysis`),
`evidence`, `certainty` (`deterministic` | `reference`) and, where applicable,
generation, file, line and language. There is no numeric confidence score —
the contract is deterministic states plus evidence. Edge IDs are stable
hashes over project, type, source, target and context; no random UUIDs.

### Generation and fingerprint

The graph carries `parserFingerprint` (Phase 69), `semanticFingerprint`
(Phase 71: semantic schema version + edge factory version + relationship rules
version + edge type set) and the resolution snapshot's own fingerprint. A
graph computed under different semantic rules is stale and must be rebuilt —
source hashes alone are not sufficient identity. No timestamps are used.

### Validation and incremental cleanup

The enriched graph must pass `assertValidGraph()` before it replaces the
structural generation: missing source/target, cross-project targets, invalid
edge type, illegal source/target combination and duplicate IDs all fail the
build rather than persisting a corrupt generation. Incremental repair rebinds
or removes edges through `graph-repair.ts`, so a deleted symbol leaves no
dangling `CALLS` edge and duplicate producers cannot create parallel semantic
corruption.

### Consumers

Query, impact, dead-code and architecture consume edge types rather than
anonymous adjacency: `trace_calls` follows `CALLS` (optionally
`CALL_REFERENCE`), `graph_dependents`/`graph_path`/`graph_neighborhood` report
the relationship type, and `find_callers` distinguishes resolved callers from
references. Coverage stays capability-aware (`graph-semantics.ts`
`edgeTypesForCapability`): complete `DEFINES` coverage never justifies a
call-graph negative claim.

### Non-goals

Phase 71 adds no LLM, embeddings, vector database, fuzzy inference or
probabilistic edges, no HTTP/GraphQL/gRPC/pub-sub linking, no cross-repo
Fleet Graph, no runtime trace ingestion and no query language. `HANDLES` and
`CONFIGURES` are only populated where declaration evidence already exists;
no speculative edges are invented to fill the schema.

---

## Phase 72 — Cross-Service Intelligence

Phase 72 links protocol resources that cross service boundaries inside one
ToolNet project. It runs entirely on the already-scanned source: no network
request, no DNS lookup, no package manager, no source execution, and no
runtime trace ingestion.

```text
Source Code
    │
    ▼
Framework / Protocol Extractors
    │   (HTTP server, HTTP client, event channels)
    ▼
Canonical Endpoint / Channel Model
    │
    ▼
Deterministic Cross-Service Linker
    │
    ▼
Semantic Graph (Phase 71 registry) → Impact / Query / MCP
```

### Service model and detection

`ServiceDescriptor` identity is deterministic:
`projectId + canonical service root`. It is derived from manifest evidence —
`package.json`, `go.mod`, `pyproject.toml` — discovered by a bounded, ignored-
directory-aware walk. Directory names are never the sole authority, and a
service whose kind cannot be proven from manifest evidence stays `unknown`.
Because identity includes the service root, `apps/api` and `examples/api` never
collide even when both packages are named `api`.

### Canonical endpoints

Route parameters normalise to a single canonical placeholder across
frameworks (`:id`, `{id}`, `<id>`, `[id]` → `{param}`), while static segments
are preserved verbatim: `/orders/current` never collapses into
`/orders/{param}`. Router prefixes are resolved transitively with a cycle
guard, so `app.use('/api', router)` + `router.use('/orders', r)` +
`r.post('/:id')` becomes `POST /api/orders/{param}`.

### Extractors

| Language      | Server declarations                            | Client calls                      | Events                |
| ------------- | ---------------------------------------------- | --------------------------------- | --------------------- |
| TypeScript/JS | Express/Fastify/Koa/Hono, NestJS decorators    | `fetch`, `axios`, axios instances | `emit`/`on`           |
| Python        | FastAPI/Flask decorators (+`APIRouter` prefix) | `requests`/`httpx`                | `emit`/`publish`/`on` |
| Go            | `net/http`, Gin/Echo/Fiber routers, `Group`    | `http.Get/Post`, client methods   | `Publish`/`Subscribe` |

Extractor selection goes through `CrossServiceExtractorRegistry`; extractors
are keyed by id and duplicates are rejected, so no giant `if/else` chain
decides the parser.

### Linking and false-positive protection

A client call only produces an edge when exactly one declared endpoint matches
method and canonical path. Two services declaring `POST /orders` with no host
evidence yields `AMBIGUOUS_ROUTE` and **zero** edges — never both, never one at
random. Unprovable targets stay unresolved:

| Reason                  | Meaning                                          |
| ----------------------- | ------------------------------------------------ |
| `DYNAMIC_TARGET`        | URL built from a non-static expression           |
| `AMBIGUOUS_ROUTE`       | more than one deterministic candidate            |
| `NO_ROUTE_MATCH`        | no declared endpoint inside the project scope    |
| `UNRESOLVED_CHANNEL`    | channel not provable as a static string          |
| `UNSUPPORTED_FRAMEWORK` | declared protocol framework without an extractor |

Credentials in URLs are redacted before any evidence is retained; the raw
source, headers and environment values are never persisted.

### Graph edges

Phase 72 extends the shared Phase 71 registry rather than introducing a second
vocabulary:

| Edge                                         | Meaning                                             | Direction               |
| -------------------------------------------- | --------------------------------------------------- | ----------------------- |
| `HTTP_CALLS`                                 | deterministic HTTP client call                      | function/method → route |
| `RPC_CALLS` / `GRAPHQL_CALLS` / `TRPC_CALLS` | reserved protocol-specific calls (no extractor yet) | function/method → route |
| `HANDLES`                                    | handler handles a route                             | handler → route         |
| `EMITS`                                      | publisher writes a channel                          | function/method → event |
| `LISTENS_ON`                                 | consumer subscribes to a channel                    | function/method → event |
| `DEFINES`                                    | service contains route                              | service → route         |

Producer and consumer are never joined directly: they connect only through the
shared event channel. A caller is never linked straight to a cross-service
handler — the path always goes through the route or channel node.

### Coverage integration

`cross_service_graph` is a first-class Phase 68 capability backed by
`cross_service` evidence. It is `complete` only when there is no dynamic
target, no ambiguity, no unresolved channel and no unsupported framework;
the reasons `DYNAMIC_ENDPOINT`, `AMBIGUOUS_ENDPOINT`,
`UNRESOLVED_EVENT_CHANNEL`, `UNRESOLVED_HTTP_REFERENCE`,
`UNSUPPORTED_SERVICE_FRAMEWORK` and `CROSS_SERVICE_UNRESOLVED` otherwise force
`negativeClaimSafe: false`. Impact analysis flags
`impactMayBeUnderreported` and reports a structured `crossServiceCoverage`
block, never a prose-only warning.

### Generation, incremental behaviour and persistence

The cross-service fingerprint is deterministic (schema version + extractor
rules version + normalization version + extractor ids + the Phase 71 semantic
fingerprint) and timestamp-free. The snapshot is derived state,
project-isolated, stored at `projects/<projectId>/graph/cross-service.json`.

The incremental indexer re-derives the cross-service layer from the freshly
built graph, so renaming or deleting a route/channel can never leave a stale
`HTTP_CALLS`/`EMITS`/`LISTENS_ON` edge behind (correctness over
optimisation).

### Non-goals

Phase 72 adds no GraphQL/gRPC/tRPC linkage (those protocols are reported as
`UNSUPPORTED_SERVICE_FRAMEWORK`, not guessed), no cross-repo or cross-service
network discovery, no runtime evidence, no LLM, no embeddings and no vector
database.

## Phase 73 — Cross-Repo Intelligence / Fleet Graph

Phase 73 answers cross-repository questions for the ToolNet projects this
install knows about. It stays static, passive and deterministic: no repository
is cloned, no URL is fetched, no DNS is resolved and no source is executed.

### Project Graph vs Fleet Graph

The project graph remains authoritative for everything inside one project.
The Fleet Graph is a **derived overlay** that contains only project identity
plus cross-project relationships:

```text
Project Graph A     Project Graph B     Project Graph C
      │                    │                   │
      └───── sanitized FleetProjectExport ─────┘
                          │
                          ▼
                     Fleet Graph
             (identity + CROSS_* edges only)
```

A project's symbols, edges, FTS index, architecture and source never cross the
boundary: the builder consumes a minimal `FleetProjectExport` view (services,
canonical endpoints, outbound calls, event channels, package identity)
produced alongside the Phase 72 cross-service snapshot. Full graph duplication
is a hard violation.

### Project identity and registry

`projectId` reuses the canonical ToolNet project identity from
`.toolnet/project.json`; it is never derived from a folder name, a package name
or a GitHub display name. Optional Git remotes are normalized
(`git@github.com:org/repo.git` and `https://github.com/org/repo.git` compare
equal) and credentials are stripped before anything is stored. The registry
lives in its own namespace, `fleet/registry.json` — never inside
`projects/<id>/` — and stores only `projectId`, name, redacted remote,
availability, generation and timestamps. A project is `available` (root
present), `derived` (export persisted from another host) or `unavailable`; one
missing project never breaks the rest of the fleet.

### Fleet generation and staleness

Fleet generation is a deterministic fingerprint over the fleet schema version
and the `projectId:graphGeneration` pairs, folded into a stable hash.
Timestamps are never part of identity. Each edge pins the `sourceGeneration`
and `targetGeneration` it was derived from. When a registered project's
`pinnedGeneration` no longer matches its export, that project is marked
`stale` and **contributes no current links**; coverage becomes `partial` with
`FLEET_PROJECT_STALE`. Removing a project from the registry drops every
`CROSS_*` edge that referenced it, while the underlying project storage is
never touched.

### Cross-project edges

Phase 73 adds a distinct cross-repo vocabulary rather than overloading
language-level `CALLS`:

| Edge                                                           | Meaning                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `CROSS_HTTP_CALLS`                                             | a call site in project A deterministically targets a route in project B |
| `CROSS_EMITS`                                                  | project A emits a channel that project B consumes                       |
| `CROSS_LISTENS_ON`                                             | project B consumes a channel emitted by project A                       |
| `CROSS_PACKAGE_DEPENDS_ON`                                     | project A declares a local/workspace dependency on project B's package  |
| `CROSS_RPC_CALLS` / `CROSS_GRAPHQL_CALLS` / `CROSS_TRPC_CALLS` | reserved vocabulary — no producer until those protocols are extracted   |

Producer and consumer are never joined directly: the relationship always goes
through the shared channel node, exactly as in Phase 72.

### Evidence and ambiguity

Every edge carries machine-readable evidence — `SERVICE_IDENTITY`,
`HOST_MATCH`, `METHOD_MATCH`, `CANONICAL_ROUTE_MATCH`, `PROVIDER_MATCH`,
`CHANNEL_MATCH`, `PACKAGE_IDENTITY`, `LOCAL_DEPENDENCY_SPECIFIER` — and never a
confidence score. A pair links only when exactly one target proves out:

- Two projects declaring `POST /orders` with no host evidence produce
  `AMBIGUOUS_CROSS_PROJECT_ENDPOINT`, **zero** edges and a sorted candidate
  list.
- Event channels are provider-aware: a Node `EventEmitter` channel and a
  Socket.IO channel both named `order.created` are not the same channel.
- An external registry dependency (`express`) is never mapped onto a ToolNet
  project that happens to share its name; only canonical package identity plus
  a local/workspace specifier links.
- Relationships between two services inside the _same_ project are Phase 72
  territory and never become `CROSS_*` edges.

### Coverage and negative claims

Fleet coverage has its own result driven by project availability, freshness,
Phase 72 cross-service completeness, ambiguous matches and unresolved
references. `negativeClaimSafe` is true only when the declared fleet scope is
complete, and the coverage always names the `projects` in scope plus the
`missingProjects`/`staleProjects`, so "no repo calls X" is never claimed from a
partial fleet. Fleet scope is the set of ToolNet projects this install knows
about — never the whole organisation.

### Wiki and Fleet state recovery

Wiki and Fleet state are shared knowledge namespaces (`wiki/*.v1.json`,
`fleet/*`), not project-scoped data. Their recovery contract is deterministic
and non-destructive:

- **Wiki.** `wiki/state.v1.json`, `wiki/governance.v1.json` and
  `wiki/automation.v1.json` each carry the owning `projectId`. A missing file
  is a valid _unused_ subsystem, never corruption; reading never writes and
  the first real mutation initializes state lazily. A file owned by another
  project (`project_mismatch`), a future schema (`schema_unsupported`),
  broken revision references (`revision_integrity_failed`) or a corrupt
  payload (`corrupt`) is reported with a typed error and left byte-for-byte
  untouched — ToolNet never adopts or rewrites it. `wiki:inspect` is read-only
  and `wiki:repair` only applies a supported migration (identity at schema
  version 1), never deleting state. Status and doctor report the exact state;
  `unused` is healthy.
- **Fleet.** Registry, snapshot and coverage are three distinct states.
  `fleet_projects`/`fleet_status` are read-only and report
  `not_configured`, `registry_empty`, `snapshot_missing`, `snapshot_stale`,
  `snapshot_corrupt`, `registry_unsupported`, `snapshot_unsupported` or
  `current` — never a generic "unavailable". Registered-without-snapshot is
  `snapshot_missing` with `buildRequired: true`. Publishing is an explicit
  lifecycle action (`fleet:build`), which rebuilds the derived snapshot from
  the registered projects' export views and stamps coverage with the
  snapshot generation, so coverage for one generation can never be read as
  current for another. A partial fleet is published with explicit coverage
  and `negativeClaimSafe: false`, never silently trimmed.

### Impact

Cross-repo impact is opt-in (`analyze_impact` with `includeCrossRepo: true`)
and additive: local impact is unchanged. It returns semantic path evidence —
`submitOrder --CROSS_HTTP_CALLS--> POST /orders --HANDLES--> createOrder
--CROSS_EMITS--> order.created <--CROSS_LISTENS_ON-- processOrder` — rather
than bare project names, and reports `fleetCoverage.impactMayBeUnderreported`
when any participant is stale or missing.

### Non-goals

No Fleet-wide query language, no runtime trace ingestion, no shared graph
artifact sync, no coordination daemon, no LLM, no embeddings, no vector
database and no fuzzy repo matching.

---

## Phase 74 — Graph Query + Schema

Phase 74 adds **TGQL** (ToolNet Graph Query Language): a bounded, read-only,
deterministic query subset over the project graph and the Fleet overlay. It is
_inspired by_ Cypher syntax but is **not Cypher** and does not claim Cypher
compatibility.

The agent asks questions through two MCP tools:

| Tool               | Purpose                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `get_graph_schema` | machine-readable node/edge/property/limit schema, derived from Phase 71/72/73 |
| `query_graph`      | run a bounded read-only query (`scope: project \| fleet`, default `project`)  |

The existing high-level tools (`find_symbol`, `find_callers`, `graph_path`,
`graph_dependents`, `graph_neighborhood`, `trace_calls`, `analyze_impact`)
remain the ergonomic path for common questions. `query_graph` is the
expert/general-purpose layer for combinations of edge types, filters and
projections, cross-service/cross-repo exploration, and questions no dedicated
tool covers.

### Pipeline

```text
text → tokens → AST → validate → plan → execute
                    │        │        │
                    │        │        └── bounded expansion, AbortSignal
                    │        └── deterministic cost estimate (index-aware)
                    └── schema + read-only + complexity gates
```

Lexing is a real tokenizer, and parsing is recursive descent — there is no
regex-only parser and no `eval`. The query string is never converted into SQL
and never passed to a shell.

### Supported clauses

`MATCH`, `WHERE`, `RETURN` (with `DISTINCT`), `ORDER BY`, `LIMIT`, `SKIP`.
Patterns support `(n)`, `(n:Type)`, `(a)-[:EDGE]->(b)`, `(a)<-[:EDGE]-(b)`,
`(a)-[:EDGE]-(b)`, bounded chains, and bounded variable-length relationships
`[:CALLS*1..3]`.

**Rejected outright:** `CREATE`, `MERGE`, `DELETE`, `DETACH DELETE`, `SET`,
`REMOVE`, `DROP`, `INSERT`, `UPDATE`, `UPSERT` (→ `READ_ONLY_VIOLATION`) and
`CALL`, `LOAD CSV`, `FOREACH`, `UNWIND` (→ `UNSUPPORTED_CLAUSE`). Unbounded
`[:CALLS*]` is rejected (`QUERY_LIMIT_EXCEEDED`); the only mutation check is not
a convention — the executor has no mutable graph API at all, and the adapters
expose `node`, `nodesByType`, `indexedLookup`, `outgoing`, `incoming` only.

### Schema registry

The schema is a single source of truth: project edge definitions are _derived_
from the Phase 71 `EDGE_SEMANTIC_REGISTRY`, and Fleet edge definitions come from
the Phase 73 cross-project vocabulary. Nothing is re-declared per call site.

Every edge definition reports `status` and `producers`, so reserved vocabulary
is never presented as knowledge that exists:

```json
{ "name": "CROSS_HTTP_CALLS", "scope": "fleet", "status": "active",
  "producers": ["phase73-cross-project-linker"], "currentlyProduced": true }
{ "name": "CROSS_RPC_CALLS", "scope": "fleet", "status": "reserved",
  "producers": [], "currentlyProduced": false }
```

`CROSS_RPC_CALLS`, `CROSS_GRAPHQL_CALLS`, `CROSS_TRPC_CALLS` (and the project
`RPC_CALLS`/`GRAPHQL_CALLS`/`TRPC_CALLS`) are queryable but reserved: no
producer emits them, so a query returns no rows and coverage stays partial.

Properties are allowlisted per node type. `metadata`, `source`, `secret`,
`token`, `credentials`, `headers`, `env` and similar keys are denied globally,
so a projection can never reach raw metadata or credentials.

### Scopes and isolation

`scope: "project"` reads only the current project graph. A query cannot reach
another project through a property filter (`WHERE f.projectId = "B"` yields no
rows), and the adapter filters by the current project id.

`scope: "fleet"` is a **composite** view: the sanitized Fleet overlay (projects

- `CROSS_*` edges), the sanitized per-project export views, and the _current_
  project graph only. Remote internals are never exposed. Cross-scope traversal
  uses node **identity aliasing** — a local route/event symbol and its Fleet
  resource are the same node — so no synthetic edge is ever created to fake a
  relationship. `MATCH (a:Project)-[:CROSS_HTTP_CALLS]->(b:Project)` is a
  documented projection of the same resource-level edge.

Fleet HTTP ambiguity semantics are preserved exactly: a bare relative client
path with several candidate services stays `AMBIGUOUS_CROSS_PROJECT_ENDPOINT`
and produces **zero** edges, and the query layer never upgrades an unresolved
reference into an edge.

### Coverage and negative claims

Every result carries coverage derived from the capability of each edge type it
touches (`CALLS` → `call_graph`, `HTTP_CALLS`/`HANDLES`/`EMITS` →
`cross_service_graph`, `CROSS_*` → Fleet coverage, ...). Lexical coverage is
never used to justify a structural or cross-repo conclusion.

An **empty result is not a negative claim**. Only when
`coverage.negativeClaimSafe` is true — every relevant capability complete _and_
fresh, with Fleet coverage safe when used — may an agent say the relationship
does not exist. Negative queries are evaluated with freshness verification, so
the field cannot be derived from a stale snapshot.

### Limits and pagination

Every bound lives in `query-v2/limits.ts`: max query length 8192 chars, max 2048
tokens, at most 4 MATCH patterns, max pattern depth 5, max 1000 rows (default
100), max 20 000 expansions, and a pre-execution cost estimate. The planner
starts from an index when an equality filter on `id`/`name`/`qualifiedName`
allows it; otherwise it reports the scan explicitly in `explain`.

Large results are paginated with a cursor bound to the query fingerprint, the
scope and the graph generation. If the generation changes between pages the
cursor is rejected with `CURSOR_STALE`, so rows from two generations can never
be mixed. Results also honour `AbortSignal` cancellation inside traversal loops.

### Non-goals

No graph database, no raw SQL tool, no arbitrary JavaScript, no `eval`, no
write/DDL/DML, no LLM, no embeddings, no vector database, no full Cypher
compatibility, and no cross-repo query language beyond the Fleet overlay.

---

## Phase 75 — Architecture Decision Records

The graph answers _what_ the code does. ADRs answer **why** it is shaped that
way. See [docs/adr.md](./adr.md) for the operational contract; this section
records the invariants that make ADRs safe to build on.

### Authority model

The structured record store is the authority:

```text
projects/<projectId>/knowledge/adr/state.v1.json
```

It holds the records plus the append-only history. Markdown under
`projects/<projectId>/knowledge/adr/markdown/` is a derived, deterministic
projection: the same record at the same revision always produces byte-identical
output, and the destination is server-controlled (a record title can never
redirect or escape it). The projection is rebuildable from the authority, so it
is deliberately excluded from the backup authority set.

The authority key is deliberately rooted at `projects/<projectId>/...`. That is
the only key shape the `ProjectScopedStorageProvider` rewrites into the owning
project's physical namespace; a bare relative key would be shared by every
project on the same storage root.

### Identity and revisions

- Human ids are `ADR-0001`, project-scoped and **never reused**, even after a
  record is superseded. The canonical key is `<projectId>:ADR-0001`.
- `id`, `projectId`, `number`, `humanId`, `createdAt` and the record schema are
  immutable; only section content and status are mutable.
- Every mutation increments `revision`. Callers may pass `expectedRevision`; a
  mismatch fails with `ADR_CONFLICT` rather than silently overwriting. There is
  no timestamp-based concurrency control.
- Mutations are applied to a draft copy and committed atomically, so a rejected
  mutation cannot leave a half-updated record or a half-applied supersession.
- Number allocation and writes are serialised through an in-process queue, so
  concurrent creates cannot collide on a number.

### Status lifecycle

```text
proposed ──► accepted ──► deprecated ──► (superseded)
    │            │
    ├──► rejected└──► (superseded)
superseded / rejected are terminal
```

`superseded` is only reachable through the atomic `supersede` operation, which
requires a replacement ADR; `change_status` cannot set it. There is no
`rejected -> accepted` path. Nothing promotes `proposed -> accepted`
automatically: acceptance is always an explicit, audited mutation.

### Supersession

`supersede(old, replacement)` writes `old.status = superseded`,
`old.supersededBy = replacement`, and `replacement.supersedes += old` in one
commit. Before committing, the linker checks whether `old` can already reach
`replacement` by walking the `supersedes` relation; if it can, the operation is
rejected with `ADR_SUPERSESSION_CYCLE`. Traversal is bounded, so a damaged
history cannot hang the operation.

### Idempotency

Every mutation computes a canonical hash of its intent. If the most recent
history event for that ADR carries the same hash, the operation is a
no-op success: no new revision, no duplicate history event — even when the
caller re-sends the now-stale `expectedRevision`. Identical `create` payloads
return the original record instead of allocating a second number.

### Search and relevance

Search is deterministic local lexical ranking (BM25-style term weighting over
title, tags, decision, context, alternatives and affected paths). No
embeddings, no vector database, no external model. Symbol relevance requires an
exact symbol id or qualified-name match — simple-name guessing is not
implemented. Path relevance uses a bounded glob subset (`*` within a segment,
`**` across segments) compiled into a regex by the resolver; caller-supplied
regular expressions are never executed.

By default only current authority statuses (`proposed`, `accepted`,
`deprecated`) are listed, searched and injected. Superseded and rejected
records are historical and are never surfaced as active architecture guidance
unless explicitly requested.

### Security

Affected paths must be project-relative: absolute paths, `~`, drive letters,
parent traversal and control characters are rejected with `ADR_PATH_ESCAPE`.
Credential material is rejected with `ADR_SECRET_DETECTED` — structured
references are scanned with the full pattern set, and every text field is
checked against unambiguous key formats (cloud/API tokens, JWTs, private key
blocks, credential-bearing URLs). Detected values are never stored or echoed.
Markdown import accepts canonical ADR Markdown only and rejects anything else
with `ADR_UNSUPPORTED_FORMAT`; fields are never guessed by a model. Errors
returned over MCP carry a machine-readable code and never a stack trace.

### Backup, recovery and isolation

`knowledge/adr/state.v1.json` is part of the snapshot authority set, so
snapshot create/restore preserves record bodies, revisions, history and
supersession links. ADRs are project-scoped: two projects may both own an
`ADR-0001` with different identity and content, and a scoped provider refuses
cross-project access outright.

### Context and impact integration

`project_context` returns `architectureDecisions` for the targeted
files/symbols (accepted ADRs only, bounded), and `analyze_impact` returns
`relevantADRs` by human id for the target's file and symbol. Both are additive:
when nothing is targeted, or when ADR storage is unavailable, the field is
simply omitted and the previous output shape is preserved. ADRs are engineering
context; they never replace impact calculation and never override the current
user instruction, current code or security policy.

### Non-goals

No LLM-authored decisions, no automatic acceptance, no automatic ADR creation
from chat or docs, no AI summarisation to guess fields, no embeddings, no
vector database, and no ADR migration performed implicitly — importing existing
ADR Markdown is an explicit, operator-initiated operation.

## Phase 76 — Shared Graph Artifact / Portable Code Intelligence Cache

Rebuilding a large repository on every machine is the most expensive thing
ToolNet does. Phase 76 introduces a portable artifact that carries **derived**
code-intelligence state from a machine that already indexed the repository to a
machine that has not. The operational contract lives in
[`docs/code-intelligence-artifacts.md`](./code-intelligence-artifacts.md); this
section records the invariants that make it safe.

### Derived state only

An artifact is derived state, never authority. It may transport the semantic
graph, the source freshness manifest, coverage evidence, the resolution
snapshot, and the derived cross-service / Fleet / architecture / analysis /
visualization summaries. It may never create, overwrite, delete or supersede
memory, tasks, sessions, the task WAL, ADRs, the Wiki or the Project Manual.

Hydration writes only the keys declared by the fixed component table in
`src/code-intelligence/artifact/components.ts`. That table is the single reason
the isolation guarantee is enforceable: no write target is derived from archive
bytes.

### Transport

An artifact is **not** a committed binary cache. Large graph blobs churn in Git,
conflict on merge and pollute history, so transport goes through the existing
`StorageProvider` abstraction — local, R2, S3 or legacy Hugging Face — and
therefore reuses the retry and client-side encryption wrappers unchanged. There
is no second remote provider and no plaintext bypass.

### Container safety by construction

The container is a length-prefixed, gzip-compressed stream of named components.
It carries no paths at all, so path traversal, absolute paths and symlink
entries are not mitigated but _impossible_: a component can only be written to
the key the component table declares for its name. Reading returns verified
bytes and never writes to a caller-supplied path.

Both directions stream. Component bytes are canonicalized before hashing, so
uncompressed component hashes are deterministic regardless of the producing
store's key insertion order; compression byte equality is not required.

### Generation identity

```text
projects/<projectId>/graph/artifacts/
  current.json
  generations/<generation>/{manifest.json,artifact.tgz,artifact.sha256}
```

The generation is a hash of the canonical project identity, the source manifest
hash and the parser, resolver, graph-semantics, query-schema and artifact-schema
fingerprints. No timestamp, no random UUID. Publishing the same generation twice
is a no-op; publishing different bytes under the same id is
`ARTIFACT_GENERATION_CONFLICT` and is never a silent overwrite.

`current.json` is a small pointer written **last**, so a partial upload leaves
the previous generation current.

### Verification before adoption

Adoption is a short, deterministic matrix, and each rejection carries its own
reason code rather than a generic "invalid artifact":

- schema, container and fingerprint compatibility (semantic schema, query
  schema, parser generation, resolver generation),
- canonical project identity and project id,
- exact source-manifest match, computed by hashing alone — the parser is never
  invoked to validate an artifact,
- SHA-256 of the archive plus every component,
- Phase 71 semantic graph validation.

Hash integrity proves the bytes are unchanged, not that they describe a coherent
graph, so the graph is validated semantically as well. The same check runs at
build time, which means a generation that would fail adoption can never be
published in the first place.

### Hydration is verify-first

Everything — compatibility, source match, hash verification, container decode
and graph validation — happens before a single component is written. A failed
hydration therefore leaves the previous generation current and queryable, and
verification failure is a normal, safe outcome: the caller falls back to a local
index.

Component writes are ordered so the `code-manifest` freshness baseline lands
last. If a storage write fails part way through, the old baseline survives and
the half-written generation is reported stale rather than trusted.

### Cross-machine behaviour

- No absolute path is ever persisted; artifacts are portable across root paths
  and across platforms.
- No machine identity (hostname, home path, IP) participates in the cache key.
- Remote failure, corruption, incompatibility or unavailability degrade to local
  indexing; nothing in the artifact path makes network access mandatory, so
  local-first operation is preserved.
- Stale local source is never overwritten by an older artifact.

### Integration

Coverage is loaded and then re-evaluated against the local source, so hydration
never asserts trust and never flips `negativeClaimSafe` on its own. Query
generation rules are unchanged: a cursor from a previous generation still fails
with `CURSOR_STALE`. The Fleet registry is re-pinned to the _export's_
generation, exactly as a normal index pass records it, so the Phase 73 staleness
contract keeps working and no old pin is silently reused.

Artifacts are excluded from Phase 67 disaster-recovery backups: the cache is
derived and rebuildable, so retention — not the authority backup — owns it.

### Non-goals

No delta artifacts, no merged cross-project artifact, no Git-committed binary
cache, no runtime trace ingestion, no LLM, no embeddings and no vector database.

## Phase 77 — Local Coordination Daemon

Multiple agents (Codex, OpenCode, Cursor, Copilot, Kiro, the ToolNet CLI and many
MCP sessions) may all open the same project at once. Phase 77 gives them one
shared, local runtime so indexing, hydration and the graph runtime are not
duplicated per process.

### Authority boundary

The daemon is runtime coordination only. It is never an authority for Memory,
Tasks, the Task WAL, Sessions, ADRs, the Wiki or the Project Manual, and no
authoritative information may exist only in daemon memory. It may be killed and
restarted at any time; recovery always comes from source, persistent authority
and derived artifacts.

### Same-machine shared runtime

- One daemon per ToolNet runtime identity, elected through a real inter-process
  instance lock that validates process liveness **and** instance identity, so a
  reused pid is treated as stale and is never killed.
- Local IPC only (Unix domain socket / Windows named pipe) with a `0700` runtime
  directory and a `0600` socket. No TCP listener and no remote protocol.
- An exact build admission barrier: protocol version, package version, build
  marker and every runtime schema fingerprint must match, because package version
  alone cannot distinguish phased source work.
- Sessions register, heartbeat and are cleaned up on crash. Disconnecting one
  session never stops another session's watcher, job or shared graph.
- Exactly one watcher per project, with bounded debounce and root containment.
- Single-flight indexing, single-flight artifact hydration and coalesced Fleet
  relinking, with real progress fanout and safe cancellation when the last
  subscriber leaves.
- Bounded resident graphs with idle eviction; pinned runtimes are never evicted.
- Bounded message size, connection count, outstanding requests, subscriptions and
  outbound queue: progress may be dropped under backpressure, responses never are.
- `CodeIntelligenceRuntime` abstracts the runtime so tools never branch on daemon
  presence; the in-process fallback preserves Phase 74 query and coverage
  semantics exactly.

See `docs/local-daemon.md` for the full contract.

## Phase 78 — Evidence Profiles (Scout / Verify / Auditor)

An agent can already use ToolNet to find a caller; what it could not know is
whether one caller means "the only caller". Phase 78 adds evidence profiles so
the amount of proof a claim needs is explicit and enforced.

### Profiles and claims

- **Scout** — fast discovery. Results are `provisional`; Scout can never support
  a negative, uniqueness, exhaustive or dead-code conclusion.
- **Verify** — task-critical verification. Checks coverage, freshness and
  pagination before allowing a negative conclusion.
- **Auditor** — bounded exhaustive. Required for absence, uniqueness, exhaustive
  and dead-code claims and for release/security conclusions; needs a current
  generation, complete coverage for the declared scope, exhausted pagination and
  no relevant unresolved references or unclosed source gaps.

The caller states the claim (`positive`, `negative`, `absence`, `uniqueness`,
`exhaustive`, `impact`, `dead_code`); correctness never depends on parsing prose.
Profile behaviour lives in one central registry.

### Decision surface

Every run returns a structured bundle: evidence level, generation, requirements,
bounded evidence with provenance, per-capability coverage, pagination state,
source-fallback report, unresolved/ambiguity counts and a `claimSafety` decision
(`allowed` / `provisional` / `blocked`) with machine-readable reasons.

### Coverage, freshness and generation

Coverage is evaluated before a negative claim is decided. Positive evidence stays
valid when coverage is partial; the coverage state is still reported. Reserved
edge vocabulary that has no producer can never ground an absence claim. A
generation change during an audit reports `AUDIT_GENERATION_CHANGED`.

### Bounded exhaustive, never omniscient

Auditor is subject to central limits (files, references, rows, projects, depth,
pages). Exceeding one yields `complete: false` with `AUDIT_LIMIT_REACHED`, never
a silently truncated complete answer. A stale cursor reports
`EVIDENCE_CURSOR_STALE`. Fleet scope must be the explicit registered participant
list; Auditor never widens a scope to an organisation.

### Source fallback

Verify/Auditor may run a bounded lexical check in a file with a recorded
structural gap. Fallback reads project-contained source only, refuses absolute
paths, escapes and sensitive files, executes nothing, makes no network calls and
never fake-resolves the graph. A file that cannot be read leaves the gap open; a
reference found in a gapped file is evidence that contradicts an absence claim.

### Dead code

A participation edge (HANDLES, LISTENS_ON, EMITS, HTTP/RPC calls, imports, tests)
means the symbol is not dead. Even a clean audit only establishes "no known
incoming references within the audited scope", so the result stays `provisional`
and is never automatic deletion authority.

### Integration

ADR constraints are attached as context only and can never influence claim
safety. Evidence runs through `CodeIntelligenceRuntime`, so a daemon shares and
single-flights identical audits keyed by project + generation + plan fingerprint,
while a standalone run stays semantically identical. Bundles are derived state:
they never touch Memory, Tasks, Sessions, the Task WAL or ADR authority.

See `docs/evidence-profiles.md` for the full contract.

## Phase 79 — Runtime Trace Evidence

Static analysis cannot know what a process actually executed. Phase 79 adds a
runtime trace evidence layer that reconciles observed behaviour with the static
graph without ever taking authority away from it.

### Authority boundary

Runtime observations are EVIDENCE. They never rewrite, create or invalidate a
static edge, and they never enter a `CodeGraphStore`. `NOT_OBSERVED` is never
`ABSENT`: not observing a call at runtime proves nothing about whether the call
exists, so runtime absence can never make a negative, absence, uniqueness or
dead-code claim safer.

The one direction runtime evidence may push is toward caution: a symbol a trace
proves executed cannot be claimed dead (`RUNTIME_SYMBOL_OBSERVED`).

### Module layout

`src/code-intelligence/runtime-trace/`

```
types.ts limits.ts diagnostics.ts sanitize.ts identity.ts matcher.ts
static-validator.ts observations.ts session.ts store.ts retention.ts
fleet.ts evidence.ts index.ts adapters/{toolnet-json,otel}.ts
```

Session records under `projects/<projectId>/runtime-traces/` are the source of
truth; the observation index is a materialized derivation that is recomputed
from them, so retention can never leave a dangling aggregate behind.

### Identity and validation

Runtime symbol references resolve in a fixed order of evidence — exact symbol
id, then a unique qualified name, then a unique file/module + name. A bare
simple name is never matched repository-wide, and two candidates produce
`TRACE_SYMBOL_AMBIGUOUS` rather than a first-match win. Each observation is
statically validated as `validates_static_edge`, `dynamic_dispatch`,
`not_in_static_graph`, `identity_conflict`, `unresolved` or `ambiguous`.

A runtime-only relation is a diagnostic
(`RUNTIME_RELATION_NOT_IN_STATIC_GRAPH`), never a contradiction of the graph and
never a new authoritative edge. Cross-repo targets resolve only through exact
registered Fleet identity, and producer→consumer flows are asserted only with a
deterministic correlation id — never from timestamp proximity.

### Provenance and security

Every observation records generation compatibility (`exact`,
`source-compatible`, `stale`, `unknown`), session and event provenance and a raw
observation count with no importance or confidence semantics. Trace ingestion is
untrusted input: secrets are dropped or redacted, prototype-polluting keys are
impossible, ingestion is bounded and staged atomically, and no source is ever
executed.

See `docs/runtime-trace-evidence.md` for the full contract.

## Phase 80 — Change Intelligence / Git-Diff Impact & Regression Guard

Phase 80 turns a code change into deterministic impact evidence. The pipeline is:

```
change input -> mapper -> impact expansion -> ADR/runtime context -> guard
```

The change is described by the diff, the structure by the graph. Runtime traces
corroborate and ADRs constrain; no source overrides another. The layer is
ANALYSIS ONLY: it never mutates the graph, never executes source or tests,
never publishes an artifact, and never becomes an authority for Memory, Tasks,
Sessions or ADRs.

### Change input and git safety

`src/code-intelligence/change/git-reader.ts` reads the working tree relative to
HEAD, the staged index, a single commit, a commit range or an explicit patch
payload. Git inspection is strictly read-only and non-mutating subcommands are
never invoked. External diff drivers and textconv filters are disabled
(`--no-ext-diff --no-textconv`), every argument is passed as an array element
(never a shell string) and revisions are validated against a conservative
grammar so an argument can never be interpreted as a git option.

A patch is hostile input: it is parsed only, never applied, and any path that
escapes the project root is rejected (`CHANGE_PATCH_PATH_ESCAPE`).

### Change model and fingerprint

The canonical model is `FileChange` (kind, old/new path, binary flag, hunks). A
deterministic snapshot id fingerprints the parsed model INCLUDING the changed
line content, so two different edits at the same position never share an
identity. The change fingerprint adds the project, mode, revisions, baseline
and candidate generations, Fleet generation and profile.

### Semantic mapping

Changed hunks map to baseline graph symbols by exact file + line ownership.
Deleted entities are resolved against the BASELINE graph so their consumers are
not lost; a symbol that no longer parses is treated as absent, not unchanged. A
body-only edit stays `SYMBOL_MODIFIED`, and `SIGNATURE_CHANGED` is emitted only
when a deterministic declaration delta is observed in the diff lines. Routes,
events, types and manifests carry their own semantic kinds.

### Impact expansion

Reverse dependency traversal preserves the semantic path that produced each
impact and separates direct from transitive impact. Cross-service impact comes
from protocol edges; cross-repo impact resolves only through exact Fleet
identity. Runtime observations corroborate impact but never shrink the static
blast radius and never clear an impact. Tests map through the deterministic
`TESTS` edge, never a filename guess.

### Regression guard

The guard reports sufficiency, never authorisation: `safeToMerge` and
`safeToDeploy` are always `false`. Reasons are machine-readable
(`DELETED_SYMBOL_HAS_CALLERS`, `REMOVED_ROUTE_HAS_CLIENTS`,
`EVENT_CHANNEL_HAS_CONSUMERS`, `ADR_CONSTRAINT`, `COVERAGE_PARTIAL`,
`GRAPH_STALE`, `FLEET_STALE`, `UNRESOLVED_REFERENCE`, `BINARY_CHANGE_UNANALYZED`,
`CHANGE_ANALYSIS_LIMIT_REACHED`, `CHANGE_INPUT_CHANGED`, `POST_CHANGE_GRAPH_UNAVAILABLE`,
…). An empty impact list is never treated as a safe change when coverage is
partial, and negative/exhaustive claims remain governed by the Phase 78
Evidence Profile claim-safety contract.

### Authority boundaries

Change analysis leaves Memory, Tasks, ADRs, runtime trace state and the static
graph byte-identical, and never enters the Phase 76 artifact payload. It runs
through the shared `CodeIntelligenceRuntime`; the daemon single-flights
concurrent identical analyses and caches only content-addressed inputs (patch,
commit, range), never a live working tree or index.

See `docs/change-intelligence.md` for the full contract.

## Phase 81 — Contract Intelligence / API & Schema Compatibility Guard

Phase 81 adds a structural compatibility layer on top of the Phase 80 change
input. It answers one question: does this change alter a public contract surface
in a way a consumer depends on?

### Contract discovery

Contract surfaces are discovered from the Phase 80 changed paths (never a second
change parse): OpenAPI 3.x (JSON, plus a conservative YAML block subset),
GraphQL SDL, protobuf/gRPC, JSON Schema, exported TypeScript type/interface
(and class) declarations, `package.json` public exports, plus HTTP route and
event channel contracts derived from the graph. Baseline content is read with a
read-only `git show <rev>:<path>`; candidate content from the working tree. The
two generations are fingerprinted separately and never mixed.

### Structural compatibility

Compatibility is decided by parsed structure and explicit, direction-aware rules
— never text similarity, never an LLM, never a confidence score. Making an
optional request field required is breaking; adding a response field is
compatible; removing a guaranteed response field is breaking; changing a
protobuf **field number** is breaking; tightening GraphQL input nullability is
breaking. Structural compatibility is reported separately from consumer impact:
a public API break is breaking even with zero known consumers.

### Consumers and context

Consumers resolve through `HTTP_CALLS` / `GRAPHQL_CALLS` / `RPC_CALLS` /
`USES_TYPE` / `IMPLEMENTS` / `CALL_REFERENCE` / `IMPORTS` / `LISTENS_ON` and the
registered Fleet scope (exact identity only). Reserved protocol vocabulary
leaves consumer coverage partial. Relevant ADRs are attached as constraints.
Phase 79 runtime observations corroborate consumers but never influence the
classification and never make a claim safer.

### Guard and claim safety

The guard returns `compatible | review_required | incomplete` with
machine-readable reasons (`CONTRACT_REMOVED`, `REQUIRED_PARAMETER_ADDED`,
`RESPONSE_FIELD_REMOVED`, `GRAPHQL_FIELD_REMOVED`, `PROTO_FIELD_NUMBER_CHANGED`,
`PUBLIC_TYPE_CHANGED`, `EXPORT_REMOVED`, `CONTRACT_SCHEMA_UNSUPPORTED`,
`CONTRACT_COVERAGE_PARTIAL`, `BASELINE_CONTRACT_UNAVAILABLE`,
`CONSUMER_COVERAGE_PARTIAL`, `CONTRACT_INPUT_CHANGED`,
`CONTRACT_ANALYSIS_LIMIT_REACHED`, …). `safeToMerge` and `safeToDeploy` are
always `false`; "no breaking contract changes" is an exhaustive claim governed by
the Phase 78 Evidence Profile contract (Auditor + fresh generations + complete
coverage + supported schemas + no unresolved refs).

### Security and authority boundaries

No remote `$ref` is ever fetched; a ref escaping the project is blocked; ref
cycles are bounded; sensitive baseline/candidate files are refused; parsed
documents are prototype-safe; examples/defaults are never persisted. Contract
analysis leaves Memory, Tasks, ADRs, runtime trace state and the static graph
byte-identical and never enters a Phase 76 artifact payload. It runs through the
shared `CodeIntelligenceRuntime`; the daemon single-flights concurrent identical
analyses and caches only content-addressed inputs, never a live working tree.

See `docs/contract-intelligence.md` for the full contract.

## Test Intelligence (Phase 82)

`src/code-intelligence/test-intelligence/` maps a Phase 80 change (plus an
optional Phase 81 contract report) to a deterministic **test selection**, an
**explicitly requested execution**, and **verification evidence**.

Relationship discovery uses explicit graph semantics only — `TESTS`, `CALLS`,
`HTTP_CALLS`/`RPC_CALLS`/`GRAPHQL_CALLS`/`TRPC_CALLS`, `EMITS`/`LISTENS_ON`,
`USES_TYPE`/`IMPLEMENTS`/`CALL_REFERENCE`, `IMPORTS` and bounded call paths — and
each selected test carries a machine-readable reason code plus the semantic path
that produced it. Ordering is a deterministic tier order, never a relevance
score; the "minimal" set is a documented greedy heuristic.

Selection is read-only and is never execution. A green selected-test run is
**evidence, not authorisation**: `safeToMerge`/`safeToDeploy` are always `false`,
and test success only removes test-specific blockers while coverage, contract and
static blockers remain. "No tests exist" is an exhaustive claim that requires an
Auditor profile with complete discovery coverage.

Execution is explicit and guarded: no command string input anywhere, argv built
as an array from the central framework registry, the executable resolved from the
project's own tooling (no install, no network), project-root cwd, path
containment, bounded timeout and output, process-group termination on
cancel/timeout, and line-by-line secret redaction before persistence. Runs pin
the change fingerprint and generation, so a run for D1 can never certify D2.

Test selections and runs live in a separate bounded, discardable namespace and
never mutate Memory, Tasks, Sessions, ADRs, runtime traces, the static graph or a
Phase 76 artifact. It runs through the shared `CodeIntelligenceRuntime`; the
daemon single-flights concurrent identical selections and executions.

See `docs/test-intelligence.md` for the full contract.

## Phase 83 — Release Intelligence / Pre-Release Certification & Compatibility Gate

Release Intelligence turns the repository state into a deterministic, read-only
release-readiness report. It inventories real capabilities from source (MCP tool
registrations, phase certification scripts, runtime methods) and from the built
`bundle/mcp.js`, enforces source/package parity, checks version and
release-manifest truth, compares public surfaces (MCP tools, CLI commands, daemon
protocol, artifact schema) with direction-aware structural rules, audits `npm
pack --dry-run` contents for secrets and unexpected derived state, and derives an
advisory semver class (major/minor/patch/unknown) from structural evidence only.
Readiness is `ready | review_required | blocked` with machine-readable reason
codes; a modified tracked storage file is classified by the store contract it
implements (Phase 84B), so only an **authority** store change blocks with
`AUTHORITY_SCHEMA_MIGRATION_REQUIRED` while a derived artifact schema change only
requires a rebuild. Phase 83 never commits, pushes, tags, bumps a version or
publishes, and never returns `safeToPublish`/`safeToMerge`. Exposed through the
`release_readiness` MCP tool; runs locally in both runtime flavors so standalone
and daemon stay in parity.

See `docs/release-intelligence.md` for the full contract.

## Phase 84B — Storage Compatibility & Migration Model

Every persisted store now has one declared contract in
`src/storage/compatibility/`: its class (`authority` / `derived` / `ephemeral`),
its current schema version, the legacy versions this build still reads, its
missing-version policy, its source of truth and any legacy value domain it
normalizes. Persisted keys and repository files under `src/storage` are resolved
to that registry once, so no call site re-derives a classification from a path.
The compatibility decision is pure and read-only and returns
`compatible | migrated | rebuild_required | blocked` with reason codes
(`STORE_SCHEMA_CURRENT`, `STORE_SCHEMA_LEGACY_COMPATIBLE`,
`STORE_MIGRATION_REQUIRED`, `DERIVED_STORE_REBUILD_REQUIRED`,
`AUTHORITY_MIGRATION_REQUIRED`, `STORE_SCHEMA_UNSUPPORTED`, `STORE_UNKNOWN`).
Authority data is never silently rebuilt or dropped; derived data is regenerated
from its declared source of truth; an unresolvable store blocks instead of being
guessed at. The first concrete case is the legacy symbol-resolution snapshot,
which kept `version: 1` while its `kind` vocabulary moved from
`CALL/REFERENCE/EXTENDS/IMPLEMENTS` to `call/type/inheritance/implementation`: it
is normalized in memory on read (original value retained as `legacyKind`), never
dropped, and canonicalized before any write.

See `docs/storage-compatibility.md` for the full contract.

## Phase 84C — Upgrade Orchestration & Migration Execution

An upgrade is now planned and executed from one deterministic model in
`src/production/upgrade/` instead of being a package swap with no local-state
story. `buildUpgradePlan` is pure and turns observed stores plus a build-identity
comparison into an ordered plan whose only actions are `compatible`, `migrate`,
`rebuild`, `block` and `ignore_ephemeral`; anything it cannot answer safely
becomes a blocker rather than a guess. `runUpgrade` executes the phases in a
fixed order — inspect, block unsupported, back up authority, migrate authority,
verify authority, rebuild derived, clear ephemeral, restart the daemon, verify —
and a failed phase is terminal: the daemon is never restarted as if the upgrade
had succeeded. Dry run is the default and touches nothing. The restart decision
comes from the Phase 77 build fingerprint (protocol, package version, explicit
build marker, runtime schema fingerprints, runtime root), never from the package
version alone, so a schema change at an unchanged version still restarts the
daemon. Authority migrations are declared in one versioned registry (currently
empty, because no authority store has changed schema) and always take a durable
disaster-recovery backup first; a legacy authority payload with no declared
migration is a hard blocker. Derived stores are regenerated, never migrated, and
nothing derived is deleted before a rebuild is known to have run. `toolnet-memory
update` keeps the package download and delegates everything else to this module,
so there is still exactly one updater.

See `docs/storage-compatibility.md` for the full contract.

## Phase 84D1 — Packaged Build Identity / Bundle Parity

Every runtime now answers "which build am I?" from one place:
`src/runtime/build-identity.ts`. The shell dispatcher, the daemon and the
standalone binary previously resolved the version three different ways, and a
package version alone cannot identify a runtime during phased work, when the
source tree carries uncommitted change at an unchanged version. The build
scripts inject `package.json`'s version plus a marker derived from a
deterministic digest of the runtime source, so two artifacts built from
different source can never present the same identity. Nothing reads a hard-coded
version: the constants are only ever reached through a `typeof` guard, which is
safe on an identifier a source run never declared. The daemon keeps comparing the
Phase 77 fingerprint (protocol version, package version, build marker, runtime
root and all five schema fingerprints) and refuses a mismatched client with
`DAEMON_BUILD_MISMATCH`. `toolnet-memory identity` probes the packaged artifact
itself and reports both its build identity and a capability inventory — the
storage contract counts, a live compatibility decision on the legacy resolution
snapshot, and the upgrade phase order — because a minified artifact cannot be
verified by grepping it for identifiers.

See `docs/build-identity.md` for the full contract.

## Phase 84 — Install / Upgrade / Migration Closeout

Phase 84 is certified as a whole, not sub-phase by sub-phase. The closeout suite
is an aggregate contract check rather than a re-run of the sub-phase suites: it
asserts that the pieces 84B–84D2B certified are actually present and wired in
the _shipped_ modules. Concretely, it requires that storage classification
partitions authority / derived / ephemeral correctly with legacy authority never
read as current, that upgrade orchestration is ordered, deterministic and inert
under a dry run, that the packaged build identity agrees with the source digest,
that recovery is reachable end to end and a real backup captures authority while
excluding derived caches, and that the live-daemon admission surface 84D2B uses
is exported by the daemon module. It then checks source/bundle parity for every
one of those surfaces, re-asserts authority safety in the plan (a migration
requires a backup first, ephemeral is discarded, derived is never backed up), and
confirms there is no release mutation anywhere in the build or package path. The
`toolnet-memory update` command still delegates to the one upgrade module, so
there remains exactly one updater.

See `docs/storage-compatibility.md` and `docs/build-identity.md` for the full
contracts.

## Phase 84D2A — End-to-End Upgrade & Rollback Data Path

84C proved the _ordering rules_; 84D2A proves the ordering rules actually survive
contact with a real project on disk. The suite mocks neither storage nor
recovery: it builds a genuine pre-upgrade install — real task operation log, real
projection, real authority files, derived stores in a real storage provider,
ephemeral state — and drives the real `buildUpgradePlan` / `runUpgrade` and the
real disaster-recovery backup, verify and restore over it. Only the two seams 84C
declared as ports are injected: `runMigration` / `verifyMigration`, because the
declared authority-migration registry is empty by design and a future schema
change wires a real implementation through the same slot, and `restartDaemon`,
because a live daemon is 84D2B's scope. That covers the full success data path
(backup → migrate → verify → rebuild → clear), authority bytes untouched by the
upgrade, a real recovery backup that is verified and contains authority while
excluding derived caches, each failure mode (migration, verification, rebuild)
with a structured code and no false PASS, and rollback from the pre-migration
backup — authority restored byte-identically, task projection rebuilt, derived
regenerated, ephemeral never restored. The legacy resolution snapshot survives
the entire path intact, the result is deterministic, and nothing installs a
package, contacts a registry or touches the network. One exception to byte
identity is documented rather than hidden: `.toolnet/retrieval/overrides.json`
is re-certified (recomputed from the restored feedback log) rather than restored
verbatim, and the upgrade itself never writes it.

See `docs/storage-compatibility.md` for the full contract.

## Phase 84D2B — Live Daemon Restart / Admission / Upgrade Failure Paths

84D2B closes the one seam 84D2A left open by exercising the daemon the way an
operator actually hits it: the suite spawns the real `src/daemon/cli.ts` entry as
a child process into a temp runtime root, over a real local IPC socket, with the
real build identity the parent process computes. Every daemon it asserts about is
a separately scheduled process and there is no second daemon implementation
anywhere in the test. It covers same-build admission; a build-marker mismatch and
a protocol mismatch (`DAEMON_BUILD_MISMATCH` / `DAEMON_PROTOCOL_MISMATCH`), neither
of which may silently attach to — or auto-kill — the running daemon; the upgrade
restart ordering, where the data phases run first, the old daemon is shut down,
and only then does the new build start exactly once with the new CLI attaching;
active-session protection, where a shutdown the Phase 77 policy refuses is a real
upgrade blocker (`DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS`) rather than a
force-kill; migration and rebuild failures with a live daemon, which leave no
restart, keep the old daemon available and retain the backup id; and a restart
failure after a successful migration, reported as an honest partial failure with
enough recovery state to retry by hand. Stale socket and stale lock recovery are
proven alongside live-owner protection: the instance lock is only ever removed by
its own owner, and a live foreign process is never touched, let alone killed. It
finishes with concurrent clients holding a single owner and no split-brain, a new
CLI arriving mid-transition receiving an explicit state instead of a silent
fallback to an incompatible daemon, and guaranteed process, socket, lock and temp
directory cleanup even when a case fails.

See `docs/storage-compatibility.md` for the upgrade contract and
`docs/local-daemon.md` for the daemon.

## Phase 85B — Fast-Startup Flake Hardening

The product invariant here is unchanged and old: the MCP `initialize` handshake
must complete _before_ the retryable storage hydration that points at unreachable
S3. What 85B changed is how that invariant is measured, because the old assertion
raced `client.connect()` against a single 3000ms wall clock that conflated three
unrelated costs — child spawn plus cold `tsx` transpilation (measured at roughly
2.1–2.5s even in isolation), transport bring-up, and the initialize round trip.
Under full-suite CPU contention the outer two pushed a healthy server over the
edge, so the test flaked without the product ever blocking on storage. The new
model separates the concerns. A generous but strictly bounded 30s process
bootstrap budget guards a true hang: `withBoundedTimeout` rejects with
`BootstrapBudgetExceededError`, never retries to mask a failure, and refuses an
unbounded, zero, negative or `NaN` budget at construction. A resolved
`client.connect()` is the deterministic readiness signal. The tight latency
assertion is then the server's own spawn-independent metric
(`toolnet_status` → `runtime.metrics.startupMs`, measured in-process after module
load and before hydration, typically 50–70ms), so host contention cannot turn a
healthy initialize into a false failure while a genuine regression that blocks
initialize on storage still blows the budget. `runtime.phase` finally proves the
handshake completed while hydration was still in flight. The change is analysis
and test only: no product code and no release metadata moved.

See `tests/mcp/startup-timing.ts` and `tests/mcp/fast-startup.test.ts`, certified
by `npm run phase85b:certify`.

## Phase 85D — Release Metadata Application (v0.6.0)

85D applies a release identity to the tree without letting the release metadata
drift away from the capability that was actually certified. Every authoritative
version source agrees on `0.6.0` and the `0.6.x` series — `package.json`,
`package-lock.json` (root and lock entry), `.release-target` and
`release-manifest.json` — and the manifest declares the release honestly: source
phase 84, `certificationThrough: "Phase85B"`, baseline `v0.5.3`, target `0.6.0`,
`additiveFromBaseline: true` and `publicBreakingChanges: 0`, plus a per-capability
list naming the work of phases 68 through 84D2B. Because that list is read by
Release Intelligence, a manifest that lags the implemented phases surfaces as
`RELEASE_MANIFEST_STALE` instead of passing quietly. The packaged `bundle/mcp.js`
carries the same `${version}+${sourceDigest}` build marker the runtime computes,
so the shipped artifact and the source tree can be compared directly, while the
internal MCP server identity stays `0.1.0` and is reported as an _inactive_
version source — it is never release truth. Historical release entries are
protected: the changelog keeps `0.4.0`, `0.3.19` and `0.3.17`, and the README
keeps the `v0.5.2` and `v0.5.3` notes as written. The certification suite is
metadata-only — it mutates no release state — and it asserts that no tag and no
publish step exist for the target: `git tag --list v0.6.0` is empty and
`releasePolicy.gitTagAutomatic` is false.

See `docs/release-intelligence.md` and `release-manifest.json` for the full
contract.
