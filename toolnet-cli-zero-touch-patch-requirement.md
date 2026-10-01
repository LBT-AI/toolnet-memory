# ToolNet CLI Zero-Touch Patch Requirement

## Status: BLOCKED_PENDING_CLI_PATCH

No local ToolNet CLI worktree exists. Remote repository: `github.com/LBT-AI/Toolnet-CLI`

## Required Change

ToolNet CLI must emit a native lifecycle event when the main user-visible agent turn completes.

### Recommended Event

Use the existing `hookRegistry` in `src/core/hooks/registry.ts`.

Add `agent.end` hook firing in `AgentHarness.executeLoop` after `finalizeResult`:

```ts
// In AgentHarness.executeLoop, after finalizeResult:
const result = await this.finalizeResult(/* ... */);

await this.hookRegistry.run('agent.end', {
  sessionId: this.sessionId,
  model: result.model,
  mode: result.mode,
  success: result.verdict === 'SUCCESS',
  error: result.error,
});

return result;
```

### Payload Shape

```ts
interface AgentEndHookPayload {
  sessionId: string;
  model?: string;
  mode: string;
  success: boolean;
  error?: string;
}
```

### ToolNet Memory Receiver

ToolNet Memory already provides a receiver at:

```
toolnet-memory session:toolnet-cli-auto
```

This command:

1. Reads the ToolNet CLI session JSON from `~/.toolnetcli/sessions/<sessionId>.json`
2. Uses the existing `syncToolNetCliSession` adapter
3. Ingests only unseen delta via source cursor `toolnet-cli.message-count`
4. Flushes to canonical MemoryStore via `SessionCore.flush()`

### Recursion Guard

ToolNet CLI must set an internal origin flag before invoking the receiver so the receiver can suppress re-entrant capture:

```
TOOLNET_CLI_INTERNAL_ORIGIN=1
```

The receiver should skip capture when this flag is set.

### Headless Mode

`toolnet -p "..."` headless execution must also trigger `agent.end` on successful completion.

### Cancellation

Cancelled turns (Ctrl+C) must NOT trigger auto-capture. Distinguish:

- `agent.end` with `success: true` → capture
- `agent.end` with `success: false` → no capture
- `cancelled` event → no capture

### Installation

Once the patch is applied, ToolNet Memory `integrate:toolnet-cli` should:

1. Verify `agent.end` hook is registered
2. Configure the hook command: `toolnet-memory session:toolnet-cli-auto`
3. Verify the receiver works
4. Update status to `captureMode: 'native'`

### Files to Modify (ToolNet CLI repo)

- `src/core/hooks/registry.ts` — ensure `agent.end` is in `HookName` union
- `src/lib/harness/agentHarness.ts` — fire `agent.end` hook in `executeLoop`
- `src/tui/app.ts` — no change needed (already funnels through `AgentHarness`)
- `src/lib/nonInteractive.ts` — no change needed (already funnels through `AgentHarness`)
