# Task Session Resume Bootstrap

Phase 47 adds automatic, bounded Task recovery context to existing session startup surfaces.

## Resolution priority

For a project and agent, ToolNet resolves in this order:

1. an existing valid lease owned by the agent (`owned`),
2. an explicit active handoff targeted to the agent (`handoff`),
3. the agent's expired lease (`recoverable`),
4. the deterministic ready Task (`recommended`),
5. no executable work (`none`).

A valid lease owned by another agent is never stolen. Replication conflicts remain fail-closed and prevent recovery or execution selection.

## Claim policy

Startup discovery does not claim a recommended Task. The resolver returns `requiresClaim: true`; the agent or an explicit execution workflow must claim it through the normal orchestration guards.

Expired recovery is also non-mutating by default. Set:

```sh
export TOOLNET_TASK_AUTO_RECOVER=1
```

before startup to allow the shared session-resume facade to reclaim an expired, unconflicted lease for the same agent. Recovery still uses the normal Task lease and revision guards.

## Bootstrap format

The structured `SessionExecutionResolution` and `TaskExecutionContext` are the internal APIs. `renderSessionExecutionBootstrap()` creates a compact text block containing only durable execution data:

- task title and status,
- progress,
- next action and blocker,
- bounded files and tests,
- the latest handoff.

The renderer sanitizes strings and caps output at 8,000 characters. It never includes WAL records, raw terminal output, full evidence history, credentials, or hidden reasoning.

## Session integrations

### Codex

The existing `session:codex-context` SessionStart hook adds the Task bootstrap before the existing fast local project context. It remains fail-open and does not contact remote storage.

### OpenCode

The existing OpenCode plugin continues to inject `context:print` once per native session through its system-transform hook. `context:print` now includes the same canonical Task bootstrap, so OpenCode does not need a second resolver or a preliminary `task_next` call.

### MCP and CLI

`task_resume_context` delegates to the same orchestration resolver and can return both structured resolution and rendered bootstrap. `task:resume-context` remains available for explicit diagnostics; without a Task ID it renders the session resolution for `--agent` (or `TOOLNET_AGENT_ID`).

## Heartbeat lifecycle

When `SessionCore.start()` resolves an owned or handed-off Task with a valid lease, it starts one scoped `TaskHeartbeatRuntime`. Repeated starts replace the previous timer rather than creating duplicates. Session end stops it. Recommended or conflicted Tasks do not start a heartbeat.

## Restart and handoff examples

Same-agent restart:

```text
Codex / VPS A owns Task X
        ↓ restart with a new native session ID
ToolNet resolves the lease by agent identity
        ↓
mode=owned, requiresClaim=false
```

Cross-host handoff:

```text
Codex / VPS A
        ↓ explicit handoff
OpenCode / VPS B
        ↓ replication converges
mode=handoff, exact Task X
```

The native session ID is provenance, not the sole ownership identity. Task lease agent identity, project scope, handoff history, and replication conflict state remain authoritative.

After a task completes, the next Task may be shown as `recommended`, but the startup resolver never auto-claims recommended work unless an explicit auto-claim workflow requests it.
