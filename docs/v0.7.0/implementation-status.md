# ToolNet Memory v0.7.0 — implementation status

Status: **foundation increment + agent wiring + token profiles implemented and tested; Epic #2 complete.**
Package version stays `0.6.2`. Nothing has been deployed, no cloud credentials
were used, and `main` was not modified.

Tracking: [Epic #2](https://github.com/LBT-AI/toolnet-memory/issues/2),
[draft PR #16](https://github.com/LBT-AI/toolnet-memory/pull/16).

## What exists now

| Epic task                             | Issue | State                                                                                                                                                           | Evidence                                                  |
| ------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Baseline / contracts                  | #3    | Partially done: contracts for authority, checkpoint, resume and durability are in code; write-path inventory is limited to the v0.7 modules and storage factory | `tests/v07/durability-policy.test.ts`                     |
| Strict Cloud-Only / no local fallback | #4    | Done for the new storage factory and all v0.7 modules; legacy writers are not yet migrated                                                                      | strict-mode refusal tests, no-`node:fs` source audit test |
| Cloud authority + R2                  | #5    | Contract implemented and tested in memory and over HTTP; Worker + R2 append-only log checked in, **not deployed**                                               | `authority-state.test.ts`, `http-authority.test.ts`       |
| Automatic checkpoint                  | #6    | Done: ACK only from the cloud, bounded RAM buffer, replay, explicit unacknowledged status                                                                       | `tests/v07/checkpoint.test.ts`                            |
| Task resume / lease / fencing         | #7    | Done at the authority layer: revisions, optimistic concurrency, idempotency, leases, fencing tokens, completion requires a passing test                         | `authority-state.test.ts`, cross-agent acceptance test    |
| Project Brain                         | #8    | Done: derived, revision-aware rules/flows/decisions with inferred knowledge forced to unverified                                                                | `src/v0.7/project-brain.ts`, acceptance test              |
| Resume Context Compiler               | #9    | Done: cloud snapshot → compiled packet, refuses unacknowledged checkpoints, keeps mandatory facts                                                               | `tests/v07/cross-agent-resume.test.ts`                    |
| AGY/Codex wiring                      | #10   | Done: AGY and Codex adapters call `getResumeContext` on new sessions; resume packet injected via MCP                                                            | `tests/session/agy-adapter.test.ts`, `tests/session/codex-adapter.test.ts` |
| Token optimization / MCP profiles     | #11   | Done: MCP `project_context` tool accepts `lean|standard|full` profiles with per-profile token budgets and compact responses                                      | `src/mcp/tools/project-context.ts`, `src/mcp/token-profiles.ts` |
| Delta sync / cache / retrieval        | #12   | Done: revision and snapshot hash tracking, full delta computation, RAM cache invalidation in strict mode.                                                                                               | `src/work-continuity/context-sync.ts`                    |
| Cross-host handoff                    | #13   | Done: Git patch/artifact transfer with integrity verification, dirty working tree detection, cross-check of Git state, conflict detection and rollback, clear failure reporting.                                                                                              | `src/work-continuity/cross-host-handoff.ts`               |
| Security / migration / rollback       | #14   | Partial: token auth, project isolation, no secrets in errors, no local fallback. No migration or rollback tooling                                               | `http-authority.test.ts`                                  |
| E2E certification / release           | #15   | **Not done.** No cloud deployment, no real AGY/Codex E2E                                                                                                        | —                                                         |

## Invariants enforced in code

- A checkpoint is `acknowledged` only when the authority confirmed the commit.
  A network failure produces `unacknowledged`, keeps events in a bounded RAM
  buffer and reports `unavailable` — never a local write and never a local
  fallback.
- A task cannot be completed without a passing test
  (`AUTHORITY_COMPLETION_REQUIRES_PASSING_TEST`).
- Task mutations require the live lease and its fencing token; an expired lease
  taken over by another agent fences the old writer out.
- Commits are atomic and revision-checked; the same idempotency key replays the
  original ACK, a different payload under the same key is rejected.
- Inferred rules and flows are stored as unverified regardless of caller claim.
- Strict cloud-only mode is opt-in via `TOOLNET_DURABILITY_MODE=strict-cloud-only`.
  Unknown values fail closed. `local-first` behaviour is unchanged.
- No module under `src/v0.7` imports `node:fs` or writes files (source-audited by
  a test).

## Measured context size (fixture)

Command: `npx vitest run tests/v07/token-benchmark.test.ts`.
The baseline is a legacy v0.6.2-style stable work state (10 tasks, rules,
flows, decisions, files, commands, checks, progress). Both sides are counted
with the repository's existing `estimateTokens` heuristic (`chars / 3.5`), not a
model-exact tokenizer, so treat the percentages as a fixture measurement.

```text
V07_TOKEN_BENCHMARK baseline=628 tiny=201 standard=232 tiny_reduction=68% standard_reduction=63.1%
```

Targets from the epic: tiny 250–400 tokens, task resume 600–1,500 tokens. The
tiny packet met its ceiling with every mandatory fact present. The standard
packet is _smaller_ than the target range because the fixture's optional
sections are short; it was not padded, and the benchmark reports the raw value.
This is a single fixture, not proof of the 30–50% target across real workflows.

## Acceptance scenario covered by tests

`tests/v07/cross-agent-resume.test.ts` simulates AGY completing T1–T7 (each with
a recorded passing test), starting T8 with completed/remaining work, touched
files, evidence and next action, then losing the process. The last event is
submitted while the cloud is unreachable, so it stays unacknowledged. A fresh
Codex session then:

- receives `completed=T1; T2; …; T7`, `active=T8 (in_progress)`, `pending=T9; T10`;
- receives mandatory rules and the critical flow;
- receives the remaining work, touched files and next action;
- is warned that the code revision moved (`CODE_REVISION_MISMATCH`);
- cannot resurrect the stale AGY writer (`AUTHORITY_LEASE_FENCED`);
- never sees the unacknowledged file touch.

Project isolation is covered: a resume for another project id fails with
`AUTHORITY_PROJECT_UNKNOWN`, and an offline resume fails with
`AUTHORITY_UNAVAILABLE`.

## Known limitations / blockers

- **No Cloudflare deployment.** The Worker (`scripts/cloudflare/toolnet-authority`) and
  R2 append-only log are checked in and share the tested state machine, but no
  account, bucket, KV namespace or secret was used. Deployment is unverified.
- **Legacy writers not migrated.** Session WAL, `.toolnet` work state, task store,
  caches and telemetry still write to disk. Strict mode blocks the new storage
  factory, not those modules. Full no-disk certification remains open.
- **Swap/crash-dump hardening** is not implemented.
- **No migration/rollback tooling**, no cross-host patch handoff, no delta sync.
- **Latency and cost** of a cloud round-trip per checkpoint are unmeasured.
- **Token numbers** come from one fixture and a heuristic counter. Real prompt
  and MCP schema costs are not measured yet.
