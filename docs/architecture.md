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
