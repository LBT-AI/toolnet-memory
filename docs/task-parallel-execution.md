# Multi-Agent Parallel Task Execution

Phase 50 uses the Phase 49 deterministic dependency scheduler to coordinate
multiple coding agents over independent persistent Tasks.

## Execution model

```text
Persistent Tasks → Dependency Scheduler → parallelReadyTaskIds
                                  ↓
                    Parallel Execution Coordinator
                      ↓          ↓          ↓
                   Codex      OpenCode      Kiro
```

Each agent receives at most one Task.

## Existing ownership wins

If Codex already owns Task A, the coordinator keeps Codex on Task A while
other agents may receive independent ready Tasks.

## Dependency and lease safety

A Task with incomplete dependencies is never assigned. Every real assignment
passes through `TaskParallelExecutionCoordinator`,
`TaskOrchestrationEngine.claim()`, and `TaskHandoffEngine.claim()`. The
coordinator never writes leases directly.

## Opt-in startup assignment

By default, a recommended Task remains read-only:

```text
TOOLNET_TASK_AUTO_ASSIGN unset → recommended, not claimed
```

To opt in:

```bash
export TOOLNET_TASK_AUTO_ASSIGN=1
```

Then startup may atomically claim the deterministic recommendation through the
normal lease/dependency/conflict guards. Existing session startup heartbeat
handling starts after the result becomes owned.

## Cross-host behavior

Phase 50 does not add a distributed lock. Cross-host execution continues to
rely on immutable operation replication and conflict detection. Ambiguous or
conflicted Tasks are not assigned.

## Process spawning

The coordinator distributes and claims Tasks for already-running agents. It
does not launch Codex, OpenCode, Kiro, or any other provider process.
