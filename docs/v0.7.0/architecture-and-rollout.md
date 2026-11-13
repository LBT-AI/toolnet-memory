# ToolNet Memory v0.7.0: Cross-Agent Continuity

Status: **Design approved as backlog; implementation in progress.** No production deployment or authority migration has occurred. Track all work in [Epic #2](https://github.com/LBT-AI/toolnet-memory/issues/2).

## User story

An AGY CLI agent is implementing a ten-task project. T1–T7 are verified complete; T8 is partly implemented; T9–T10 have not started. AGY runs out of model tokens or is unexpectedly terminated. The user starts Codex CLI in the same project, expecting it to identify the project, important flows, enforceable rules, exact task state, blockers, partially touched files, verification evidence and safe next action **without any manual recap**.

Cloud ACK state is authoritative. A transient unacknowledged event must never be represented as successfully checkpointed.

## Invariants

1. **No lost knowledge for token savings.** Do not delete or summarize away canonical evidence, historically superseded decisions, active blockers or required project rules.
2. **Current work authority.** Use the task operation state rather than raw conversational narratives; a task completed without test evidence is not "verified".
3. **No silent truncation of mandatory facts.** Context budget is a soft target. If mandatory facts exceed it, include them, mark overflow and offer focused expansion; no fabricated success.
4. **No persistent ToolNet-owned state on VPS in strict cloud-only mode.** Audit every path: session WAL/state, tasks, leases, checkpoints, startup briefs, project manual, code indexes, trace logs, telemetry, staging, cache, temp files and debug logs. No local fallback; cloud unavailable means explicit failure. Security hardening must also address swap and crash dumps.
5. **Revision and ownership proof.** Cross-agent restore must carry project identity, cloud revision, code revision, acknowledgment status and task fencing. If source code has changed or is uncommitted, inspect it before writing.
6. **Preserve compatibility** with existing local-first and remote deployments. Strict Cloud-Only is a separate explicit mode, not a unilateral change for existing installations.
7. **No secrets in packets, logs or telemetry.** Use private authenticated cloud resources, encryption and project-level authorization.

## Proposed data flow

```text
AGY CLI hooks / Codex CLI hooks
         |
         | lightweight event (task/file/test/decision)
         v
 Cloud API: auth, project scope, revisions, lease, idempotency
         |                  |
         | transactional     | immutable history/evidence
         v                   v
 Cloud State Authority     Cloudflare R2
         |
         v
 Project Brain + checkpoint + rule/evidence resolver
         |
         v
 Resume Context Compiler (pure, bounded, integrity-first)
         |
         +--> Tiny Bootstrap: 250–400 token *target*
         +--> Task Resume: 600–1500 token *target*
         +--> Deep Memory: evidence and history on demand
         |
         v
 Codex CLI resumes T8; only fetches additional verified context as needed
```

The state store technology (Durable Objects vs a transactional DB) and Cloud API contract must be settled in [T02](https://github.com/LBT-AI/toolnet-memory/issues/5) with concurrency/fencing tests. Do not treat R2 overwrites as a transactional task database.

## Component contracts

### Project Brain

Derived, revision-aware view of project identity, critical code paths, flows, enforceable rules, technical decisions and known pitfalls. Do **not** create a second, independently authoritative rule store. Tag inferred knowledge separately from code/test/user-verified knowledge; reconcile staleness on code changes.

### Task Resume Snapshot

Contains task identifier, title, authoritative status, current owner/lease/revision, completed work, remaining work, touched files, blocker, next action, verification status and source evidence references. It is not a claim that a Git working tree can be reconstructed solely from memory.

### Resume Context Compiler

`src/work-continuity/resume-packet-v07.ts` is the **first isolated prototype**, deliberately not wired into AGY or Codex startup and not authorized to generate a cloud acknowledgment itself. Only consumes data passed in by its caller; validates cloud ACK and task-state consistency; never writes to disk; labels unverified rules and changed/unverified code revision; retains mandatory data on budget overflow.

A cloud-backed resolver and verified token-counting adapter are prerequisites for production usage. Counting UTF-8 bytes is only a conservative fallback heuristic, NOT real model token accounting.

### Checkpoint safety

- Event captured -> cloud-authority revision committed -> cloud ACK returned -> packet marked eligible for resume.
- Event captured -> cloud unavailable -> event **not acknowledged**, no local fallback on strict VPS mode; report degraded status.
- ToolNet client can queue in RAM while live, with bounded buffer and explicit warning; a crash can lose unacknowledged events.
- After unplanned termination, the new agent restores the latest acknowledged revision, inspects repository tree and unresolved working-tree changes before continuing.
- Ownership fencing prevents an old agent from overwriting new work. Cross-host uncommitted patch transfer is an independently verified workflow.

## Token and correctness measurements

Measure total **prompt/tool** consumption, not only result strings:
- MCP tool definitions, server instructions, startup injection
- retrieval requests, result payloads and follow-up context
- recovery paths when task data is stale, conflicting or incomplete

Compare to v0.6.2 on fixed bilingual scenarios. Saving 30–50% is a target to test, not a promise. Never trade mandatory rule recall, verification accuracy or task continuity for token savings.

## Phases and issue references

| Phase | Issues | Gate |
|---|---|---|
| 0. Baseline + contract | [#3](https://github.com/LBT-AI/toolnet-memory/issues/3) | Storage-write inventory, task fixtures, measured baseline |
| 1. No-disk + cloud authority | [#4](https://github.com/LBT-AI/toolnet-memory/issues/4), [#5](https://github.com/LBT-AI/toolnet-memory/issues/5) | Fail closed, authenticated durable writes, concurrency |
| 2. Continuity core | [#6](https://github.com/LBT-AI/toolnet-memory/issues/6), [#7](https://github.com/LBT-AI/toolnet-memory/issues/7), [#8](https://github.com/LBT-AI/toolnet-memory/issues/8), [#9](https://github.com/LBT-AI/toolnet-memory/issues/9) | Accurate resumable T8 context; no lost rules |
| 3. Agent + efficiency | [#10](https://github.com/LBT-AI/toolnet-memory/issues/10), [#11](https://github.com/LBT-AI/toolnet-memory/issues/11), [#12](https://github.com/LBT-AI/toolnet-memory/issues/12) | Automatic startup resume and measured tokens |
| 4. Integrity + release | [#13](https://github.com/LBT-AI/toolnet-memory/issues/13), [#14](https://github.com/LBT-AI/toolnet-memory/issues/14), [#15](https://github.com/LBT-AI/toolnet-memory/issues/15) | Cross-host patch safety, upgrade/rollback, certified E2E |

## Release gates

- Fresh Codex resumes the correct T8 state after AGY SIGKILL at multiple boundaries.
- T1–T7 remain verified done, T8 incomplete until tests pass, T9–T10 pending.
- Mandatory rules and critical flows never silently disappear under tiny budgets.
- Stale writer and old code revision cannot cause false claims or task overwrites.
- Strict cloud-only integration creates **zero persistent ToolNet-owned files** on the VPS and never silently falls back; prove this by filesystem instrumentation and outage tests.
- Local-first deployments remain functional with a documented migration strategy.
- End-to-end tests, typechecking, linting, formatting, security reviews and authorized cloud deployment evidence pass before release.

## Non-goals for the foundation PR

- Enabling Cloud-Only in production.
- Changing existing AGY/Codex hook behavior.
- Deleting existing local authority data.
- Publishing v0.7.0 or claiming a reduction in real token costs before measurement.
