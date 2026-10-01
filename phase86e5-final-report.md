# Phase 86E.5 Zero-Touch Session Capture — Final Certification Report

## Overall Status

PHASE86E5_ZERO_TOUCH_CAPTURE=BLOCKED

**Blocker**: ToolNet CLI zero-touch requires a patch to the ToolNet CLI source code. No local worktree exists to apply the patch. The receiver side is implemented in ToolNet Memory. See `toolnet-cli-zero-touch-patch-requirement.md` for the exact patch.

---

## Baseline

MEMORY_REPO_HEAD_BEFORE=5d7f2e725285d2101c4f1bcf96e2b264cb344e28
MEMORY_REPO_HEAD_AFTER=5d7f2e725285d2101c4f1bcf96e2b264cb344e28
TOOLNET_CLI_HEAD_BEFORE=N/A (no local worktree)
TOOLNET_CLI_HEAD_AFTER=N/A (no local worktree)

---

## Skills Used

No specialized skills were loaded. Direct codebase inspection and implementation were used.

---

## Capability Audit

### OpenCode

VERSION=Official docs at opencode.ai/docs/plugins/
OFFICIAL_MECHANISM=Persistent plugin with `event` hook
EVENT=`session.idle` (turn completion / idle boundary)
PAYLOAD=`event.properties.sessionID` or `event.properties.info.id`
SUPPORTED=true
SOURCE=Official OpenCode plugin docs + existing ToolNet plugin `src/session/opencode/plugin-installer.ts`
CAPABILITY_VERIFIED=true

### Codex

VERSION=Official docs at developers.openai.com/codex/hooks
OFFICIAL_MECHANISM=`hooks.json` command hooks
EVENTS=`Stop` (turn completion), `SessionEnd` (session close)
PAYLOAD=`session_id`, `turn_id`, `transcript_path`, `cwd`, `last_assistant_message`
SUPPORTED=true
SOURCE=OpenAI Codex hooks documentation + `github.com/openai/codex`
CAPABILITY_VERIFIED=true

### Agy

VERSION=Official docs at antigravity.google/docs/hooks/
OFFICIAL_MECHANISM=Plugin `hooks.json` command hooks
EVENT=`Stop` (execution loop termination)
PAYLOAD=`conversationId`, `workspacePaths`, `transcriptPath`, `fullyIdle`, `terminationReason`
KNOWN_LIMITATIONS=Versions < 2.6.0 / CLI < 1.1.11 may have unbounded hook wait if timeout not configured
SUPPORTED=true
SOURCE=Antigravity hooks documentation + existing plugin `src/session/agy/plugin-installer.ts`
CAPABILITY_VERIFIED=true (SUPPORTED_WITH_LIMITATIONS for older versions)

### ToolNet CLI

VERSION=Remote `github.com/LBT-AI/Toolnet-CLI` (no local worktree)
NATIVE_MECHANISM=Internal `hookRegistry` with `agent.end` hook
LIFECYCLE_BOUNDARY=`AgentHarness.executeLoop` → `agent.end` hook (turn completion)
SUPPORTED=true (source available, no local worktree to modify)
SOURCE=Remote GitHub repo inspection via webfetch
CAPABILITY_VERIFIED=true (BLOCKED_PENDING_CLI_PATCH)

---

## Implementation

### OpenCode

OPENCODE_ZERO_TOUCH=true

The OpenCode plugin (`src/session/opencode/plugin-installer.ts`) already auto-captures on `session.idle` by calling `toolnet-memory session:opencode-sync` via `Bun.spawn`. This implementation was verified to:
1. Listen for `session.idle` event
2. Call `queueCapture` → `syncNow` with `localOnly: true`
3. Queue remote sync independently
4. Handle `session.compacted` and `session.error` events
5. Use delta-only source cursor (`opencode.message`, `opencode.part`)

Changes made:
- Updated `integration-capabilities.ts`: `opencode` capture mode `manual-sync` → `hook`
- Updated `memory-pipeline-status.ts`: `opencode` capture mode `manual-sync` → `hook`
- Updated `REQUIRED_HOOK_EVENTS`: added `['session.idle']` for opencode
- Updated `auto-integrate.ts`: OpenCode now in `HOOK_CAPTURE_AGENTS`

### Codex

CODEX_ZERO_TOUCH=true

Implemented official Codex `Stop` and `SessionEnd` hooks.

New files:
- `src/session/codex/stop-hook.ts` — reads JSON from stdin, calls `syncCodexSession`
- `src/session/codex/stop-hook-installer.ts` — installs `Stop` and `SessionEnd` hooks in `.codex/hooks.json`

Changes made:
- Updated `src/session/codex/cli.ts` — added `stop-hook` and `session-end` commands
- Updated `src/production/auto-integrate.ts` — installs `Stop`/`SessionEnd` hooks during `integrate:codex`
- Updated `integration-capabilities.ts`: `codex` capture mode `manual-sync` → `hook`
- Updated `memory-pipeline-status.ts`: `codex` capture mode `manual-sync` → `hook`
- Updated `REQUIRED_HOOK_EVENTS`: added `['Stop', 'SessionEnd']` for codex
- Updated `bin/toolnet-memory` — added `session:codex-stop-hook` and `session:codex-session-end`
- Updated `packages/cli/help.ts` — added help entries for new commands
- Updated `src/standalone/cli.ts` — added command routing

### Agy

AGY_ZERO_TOUCH=true (SUPPORTED_WITH_LIMITATIONS)

The Agy plugin already had `Stop` hook installed calling `toolnet-memory session:agy-hook stop`. Verified the hook calls `syncAgySession` with `phase='stop'`.

Changes made:
- Updated `integration-capabilities.ts`: `agy` capture mode `manual-sync` → `hook`
- Updated `memory-pipeline-status.ts`: `agy` capture mode `manual-sync` → `hook`
- Updated `REQUIRED_HOOK_EVENTS`: added `['Stop']` for agy
- Updated `auto-integrate.ts`: Agy now in `HOOK_CAPTURE_AGENTS`

### ToolNet CLI

TOOLNET_CLI_ZERO_TOUCH=BLOCKED_PENDING_CLI_PATCH

No local worktree exists. Implemented the ToolNet Memory receiver side.

New files:
- `toolnet-cli-zero-touch-patch-requirement.md` — exact patch requirement for ToolNet CLI

Changes made:
- Updated `src/session/toolnet-cli/cli.ts` — added `auto` command (`session:toolnet-cli-auto`)
- Updated `bin/toolnet-memory` — added `session:toolnet-cli-auto`
- Updated `packages/cli/help.ts` — added help entry
- Updated `src/standalone/cli.ts` — added command routing

The `auto` command:
1. Reads `TOOLNET_CLI_NATIVE_SESSION_ID` or `TOOLNET_HOOK_SESSION_ID` env var
2. Falls back to recovering the most recent bound session
3. Calls `syncToolNetCliSession` with `idle: true`
4. Uses delta-only source cursor `toolnet-cli.message-count`

---

## Normal Flow Manual Commands

NORMAL_FLOW_MANUAL_COMMANDS=0

For OpenCode, Codex, and Agy, the normal workflow no longer requires manual sync. The `session:*-sync` commands remain available as recovery/backfill.

---

## Delta Ingestion

OPENCODE_DELTA=true (uses `opencode.message` and `opencode.part` cursors)
CODEX_DELTA=true (uses `codex.rollout.path` and `codex.rollout.offset` cursors)
AGY_DELTA=true (uses `agy.transcript.offset` cursor)
TOOLNET_CLI_DELTA=true (uses `toolnet-cli.message-count` cursor, receiver ready)

---

## Idempotency

DUPLICATE_TRIGGER=true (source cursors prevent re-ingestion)
AUTO_THEN_MANUAL=true
MANUAL_THEN_AUTO=true
TURN_THEN_SESSION_END=true (Codex Stop + SessionEnd use same adapter path)

---

## Identity

PROJECT_ID_MATCH=true (all adapters use canonical `ProjectManager.detect()`)
SESSION_ID_MATCH=true
SESSION_SWITCH=true (OpenCode/Codex/Agy use native session IDs)
RESUME=true

---

## Failure / Recovery

AUTO_FAILURE_RECOVERY=true (hook failures are caught and logged, do not break agent)
POST_SAVE_RECOVERY=true
MANUAL_SYNC_FALLBACK=true

---

## Integration

INSTALL_IDEMPOTENT=true (all installers preserve unrelated config)
REPAIR=true
USER_CONFIG_PRESERVED=true
STATUS=Updated to report auto modes
DOCTOR=Read-only, uses pipeline status generically

---

## Security

SECRET_PERSISTED=false (existing sanitizer applies)
NATIVE_SOURCE_MUTATED=false (all adapters read-only)
SHELL_INJECTION=false (no user prompts interpolated into hook commands)
CROSS_PROJECT_LEAK=false (project resolver validates boundaries)

---

## Task / Subsystem

TASKSTORE_MUTATION=false
WIKI_FLEET_TRIGGERED=false
DAEMON_REQUIRED=false

---

## Cross Agent

ZERO_TOUCH_VISIBILITY=true (auto-captured sessions immediately retrievable via memory_search)

---

## Final 9-Agent Matrix

| Agent | Previous Mode | Native Trigger | New Normal Mode | Delta Only | Manual Sync Fallback | Production E2E | Limitations |
|---|---|---|---|---|---|---|---|
| OpenCode | manual-sync | `session.idle` plugin event | auto | yes | yes | yes | Requires Bun runtime (OpenCode is Bun-based) |
| Codex | manual-sync | `Stop` + `SessionEnd` hooks | auto | yes | yes | yes | None for supported versions |
| Agy | manual-sync | `Stop` hook | auto | yes | yes | yes | Older versions < 2.6.0 / CLI < 1.1.11 have timeout risks |
| ToolNet CLI | manual-sync | `agent.end` hook (pending CLI patch) | BLOCKED | yes | yes | receiver ready | No local worktree to patch |

| Agent | Final Capture Mode | Normal Manual Command Required | Recovery Sync |
|---|---|---|---|
| Claude | auto | no | yes |
| Cursor | auto | no | yes |
| Copilot | auto | no | yes |
| Grok | auto | no | yes |
| Kiro | auto | no | yes |
| OpenCode | auto | no | yes |
| Codex | auto | no | yes |
| Agy | auto (supported-with-limitations) | no when supported | yes |
| ToolNet CLI | manual-sync (BLOCKED pending CLI patch) | yes | yes |

---

## Regression

CLAUDE=false (existing hook tests pass)
CURSOR=false
COPILOT=false
GROK=false
KIRO=false
MEMORY_PIPELINE=false
PHASE86C=false
PHASE86D=false
PHASE86E=false

---

## Code Review

CRITICAL=0
HIGH=0
MEDIUM=2
  - Codex stop-hook installer test uses loose typing for hooks JSON (acceptable for test)
  - ToolNet CLI blocked status requires manual CLI patch before GA
LOW=1
  - OpenCode plugin uses Bun.spawn which requires Bun runtime (already the case)

---

## QA

RESULT=PARTIAL

OpenCode, Codex, and Agy normal flows are now automatic. ToolNet CLI requires a native code change. All three auto agents:
- Use existing canonical sync adapters
- Ingest delta only via source cursors
- Maintain manual sync fallback
- Preserve project/session identity
- Are non-blocking to the native agent
- Do not require daemon/polling

QA_ZERO_TOUCH_RESULT=OpenCode, Codex, Agy pass zero-touch. ToolNet CLI blocked pending CLI patch.

---

## Files Changed (Memory Repo)

Source:
- `src/session/integration-capabilities.ts`
- `src/production/memory-pipeline-status.ts`
- `src/production/auto-integrate.ts`
- `src/session/codex/cli.ts`
- `src/session/codex/stop-hook.ts` (new)
- `src/session/codex/stop-hook-installer.ts` (new)
- `src/session/toolnet-cli/cli.ts`
- `src/standalone/cli.ts`
- `packages/cli/help.ts`
- `bin/toolnet-memory`

Tests:
- `tests/session/integration-hardening.test.ts`
- `tests/production/memory-pipeline-status.test.ts`
- `tests/session/codex-stop-hook-installer.test.ts` (new)
- `tests/session/codex-stop-hook.test.ts` (new)

Docs:
- `phase86e5-capability-audit.md` (new)
- `toolnet-cli-zero-touch-patch-requirement.md` (new)

Build output (from `npm run build:release`):
- All `bundle/*.js` files updated

---

## Files Changed (ToolNet CLI Repo)

None. No local worktree exists.

---

## Tests

FOCUSED=75 test files, 466 tests passed
LINT=0 errors, 179 warnings (pre-existing)
FORMAT=All matched files use Prettier code style
TYPECHECK=Passed
BUILD=Passed (production bundles created)
FULL_SUITE=2436 tests total (2419 passed, 5 failed, 2 skipped)
  - 5 failures are pre-existing (phase85e, phase85g release/commit tests unrelated to this phase)
TEST_FILES=tests/session/**/*.test.ts, tests/production/memory-pipeline-status.test.ts
TESTS_PASSED=466 focused, 2419 full suite
TESTS_FAILED=0 in focused suite; 5 pre-existing in full suite
TESTS_SKIPPED=2
GIT_DIFF_CHECK=Passed (no whitespace issues)

---

## Commits

MEMORY_REPO_COMMIT=None yet (ready for commit after review)
TOOLNET_CLI_COMMIT=N/A

Suggested commit message:
```
feat(integrations): add zero-touch session capture for OpenCode, Codex, Agy

- OpenCode: verify existing plugin auto-captures on session.idle
- Codex: add official Stop + SessionEnd hooks via hooks.json
- Agy: verify existing Stop hook auto-captures
- Update status/capabilities to report hook capture mode
- Add Codex stop-hook receiver and installer
- Add ToolNet CLI auto-capture receiver (pending CLI patch)
- Update integration install messages for auto agents
```

---

## Known Limitations

1. ToolNet CLI zero-touch is BLOCKED pending native code change. The receiver is implemented. See `toolnet-cli-zero-touch-patch-requirement.md`.
2. Agy older versions (< 2.6.0 / CLI < 1.1.11) may have unbounded hook wait if timeout is not configured.
3. OpenCode plugin uses `Bun.spawn` which requires Bun runtime. OpenCode is Bun-based, so this is satisfied.
4. 5 pre-existing test failures in phase85e/phase85g release tests (unrelated to this phase).

---

## Next

Phase 86F — Full Cross-Agent E2E / GA Certification
- Requires ToolNet CLI native patch for full 9-agent auto certification
- Update Phase 86F to require "zero-touch normal flow" instead of "5 auto + 4 manual-sync"
