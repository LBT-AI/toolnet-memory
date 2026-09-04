# Multi-Agent Task Handoff

Phase 35 adds execution ownership and continuity between coding agents.
Task visibility remains project-shared.
Agent identity does not create private task namespaces.

## Lease model

An agent claims a task using a bounded lease.

Projected lease state contains:

```text
leaseId
agentId
acquiredAt
heartbeatAt
expiresAt
```

Default lease: **15 minutes**.
Minimum: **30 seconds**.
Maximum: **24 hours**.

A lease prevents two agents on the same coordinated project filesystem from
simultaneously claiming the same task.

### Claim

Example:

```text
Agent A claims Task 5
```

While the lease is active, Agent B cannot claim Task 5.

Claims are serialized through the existing Phase 33 exclusive TaskStore lock
and protected by expected task revision.

Exactly one same-revision concurrent claim may enter the authoritative log.

### Heartbeat

The current lease holder may extend its lease.

Heartbeat requires:

- matching agent ID,
- matching lease ID,
- lease still active,
- new expiry later than the old expiry.

### Release

The holder may explicitly release a task.

The task state, progress, evidence and next action remain unchanged.

Another agent may then claim it.

### Explicit handoff

Example:

```text
Agent A
  task progress = 5/10
  nextAction = Implement subtask 6
  handoff -> Agent B
```

The task keeps:

- 5/10 progress,
- next action,
- blocker state,
- evidence,
- files,
- tests,
- lifecycle state.

Only execution ownership changes.

The derived projection stores the newest 100 handoff records.
The authoritative operation log preserves the complete history.

### Lease-expiry takeover

If an agent disappears without releasing its task, another agent may claim it
after the lease expires.

The new claim is recorded as:

```text
lease-expired-takeover
```

when the previous holder differs from the new holder.

No wall-clock mutation happens silently.
Expiry is evaluated deterministically against the timestamp of the new
operation.

## claimNext

`TaskHandoffEngine.claimNext()` chooses work in deterministic order:

1. task already owned by the requesting agent,
2. active task,
3. blocked task,
4. pending dependency-ready task,
5. order,
6. creation time,
7. task ID.

Tasks with an active lease held by another agent are skipped.
Pending tasks with unresolved dependencies are skipped.

Concurrent agents race through the TaskStore revision guard. A loser reloads
state and can select another available task.

## Continuity

`TaskHandoffEngine.continuity()` exposes:

- root task,
- recommended resume task,
- parent progress,
- current owned task,
- tasks held by other agents,
- previous agent,
- last handoff,
- next action,
- unresolved dependencies.

This is the foundation used by future MCP/CLI and Tasks-panel integrations.

## Terminal states

Completing or cancelling a task clears its active execution lease.

Terminal tasks cannot be claimed or handed off.

## Scope

Phase 35 coordinates agents sharing the same project task log.

It does not claim to provide an S3/R2 distributed lock or globally consistent
remote lease service.

Cross-host immutable task-operation replication remains a later extension.

## Runtime requirements

Phase 35 adds no:

- LLM,
- embedding provider,
- vector database,
- mandatory encryption key.
