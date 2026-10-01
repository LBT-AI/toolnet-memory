# Phase 86E.5 Zero-Touch Session Capture — Capability Audit

## Preflight

- Host verified: `/root/toolnet-memory`
- Branch: `main`
- HEAD before: `5d7f2e725285d2101c4f1bcf96e2b264cb344e28`
- Repo has uncommitted Phase 86E (Fleet/Wiki) changes; not reset.

## Existing Adapter Verification

All four manual-sync adapters already reach:

- WAL → SessionCore.flush() → learner → learned journal → SessionMemoryMaterializer → MemoryStore

Verified adapters:

- OpenCode: `syncOpenCodeSession` in `src/session/opencode/adapter.ts`
- Codex: `syncCodexSession` in `src/session/codex/adapter.ts`
- Agy: `syncAgySession` in `src/session/agy/adapter.ts`
- ToolNet CLI: `syncToolNetCliSession` in `src/session/toolnet-cli/adapter.ts`

## Capability Audit

### OpenCode

- **Version/Head**: Verified against official docs at `opencode.ai/docs/plugins/`
- **Official Mechanism**: Persistent plugin with `event` hook
- **Event**: `session.idle` (turn completion / idle boundary)
- **Payload Fields**: `event.properties.sessionID` or `event.properties.info.id`, `event.type === "session.idle"`
- **Supported**: YES
- **Source**: Official OpenCode plugin docs + existing ToolNet plugin `src/session/opencode/plugin-installer.ts`
- **Current State**: Plugin already auto-captures via `Bun.spawn` + `toolnet-memory session:opencode-sync`
- **Capability Verified**: YES

### Codex

- **Version/Head**: Verified against official OpenAI Codex hooks docs
- **Official Mechanism**: `hooks.json` command hooks
- **Events**: `Stop` (turn completion), `SessionEnd` (session close)
- **Payload Fields**: `session_id`, `turn_id`, `transcript_path`, `cwd`, `last_assistant_message`, `stop_hook_active`
- **Supported**: YES
- **Source**: `developers.openai.com/codex/hooks` + `github.com/openai/codex`
- **Current State**: Only legacy `notify` (AfterAgent) is installed. New official `Stop` hook NOT yet installed.
- **Capability Verified**: YES

### Agy / Antigravity

- **Version/Head**: Verified against official Antigravity docs
- **Official Mechanism**: Plugin `hooks.json` command hooks
- **Event**: `Stop` (execution loop termination)
- **Payload Fields**: `conversationId`, `workspacePaths`, `transcriptPath`, `artifactDirectoryPath`, `modelName`, `executionNum`, `terminationReason`, `error`, `fullyIdle`
- **Supported**: YES
- **Known Limitations**: Hook availability depends on supported Antigravity CLI version. Versions < 2.6.0 / CLI < 1.1.11 may have unbounded wait if hook lacks timeout. Some auth modes/runtimes may not load plugins.
- **Source**: `antigravity.google/docs/hooks/` + existing plugin `src/session/agy/plugin-installer.ts`
- **Current State**: `Stop` hook already installed and calls `syncAgySession`
- **Capability Verified**: YES (SUPPORTED_WITH_LIMITATIONS for older versions)

### ToolNet CLI

- **Version/Head**: No local worktree found. Remote: `github.com/LBT-AI/Toolnet-CLI`
- **Native Mechanism**: Internal `hookRegistry` with `agent.end` / `session.end` hooks
- **Lifecycle Boundary**: `AgentHarness.executeLoop` → `agent.end` hook (turn completion); `shutdownAndExit` → `session.end` hook
- **Supported**: YES (source available, but no local worktree to modify)
- **Source**: Remote GitHub repo inspection
- **Current State**: No native zero-touch installed. Manual sync only.
- **Capability Verified**: YES (BLOCKED_PENDING_CLI_PATCH — no local repo to modify)

## Conclusion

| Agent       | Native Trigger Verified | Zero-Touch Feasible | Limitation                                                 |
| ----------- | ----------------------- | ------------------- | ---------------------------------------------------------- |
| OpenCode    | YES                     | YES                 | Requires Bun runtime (OpenCode is Bun-based)               |
| Codex       | YES                     | YES                 | None for supported versions                                |
| Agy         | YES                     | YES                 | Older versions (< 2.6.0 / CLI < 1.1.11) have timeout risks |
| ToolNet CLI | YES                     | BLOCKED             | No local worktree to patch                                 |
