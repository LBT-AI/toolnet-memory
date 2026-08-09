# ToolNet Memory — Repository Instructions

This repository contains the ToolNet Memory CLI and runtime.

Working principles

- Read the current source before making changes.
- Keep ToolNet Memory project-agnostic. Never hardcode a specific user's project path.
- Fast startup context must remain local, small, and bounded.
- Do not automatically run deep recovery commands during agent startup.
- Do not inject raw transcripts into normal prompts.
- Durable memory must be filtered, deduplicated, sanitized, and selectively promoted.
- Never expose credentials, API keys, tokens, passwords, or .env values.
- Preserve project isolation through .toolnet/project.json.
- Storage providers must remain pluggable: R2, generic S3, local, and legacy Hugging Face S3.
- Changes to agent integrations must respect the native mechanism of each agent.

Agent integration model

- Agy / Antigravity: native hooks and fast context injection.
- Codex: MCP and project instructions.
- OpenCode: native integration/plugin mechanisms.
- Claude-compatible agents: repository instruction files where supported.

All adapters should use the same ToolNet context and memory core rather than duplicating project logic.

Context policy

Normal startup:

minimal context
→ project rules
→ current work
→ small token budget

Do not automatically run:

toolnet-memory session:agy-recover
toolnet-memory session:codex-recover
toolnet-memory session:opencode-recover
toolnet-memory handoff:latest
toolnet-memory brief

Those are manual/deep-recovery operations.

Session memory policy

Keep:

- project rules,
- technical decisions,
- architecture decisions,
- important files changed,
- confirmed fixes,
- blockers,
- deployment rules,
- next actions.

Discard or heavily filter:

- system messages,
- ephemeral messages,
- reasoning/tool logs,
- progress output,
- npm noise,
- repeated terminal output,
- duplicate facts,
- secrets.

Quality checks

Before committing code changes, run:

npm run lint
npm run format:check
npm run typecheck
npm test
npm run build:release

Do not claim completion if these checks fail.

Releases

Never republish an existing npm version.

Before publishing:

npm view toolnet-memory@latest version
node -p "require('./package.json').version"

If the version already exists on npm, bump the package version first.
