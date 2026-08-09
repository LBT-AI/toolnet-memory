# Changelog

All notable changes to ToolNet Memory are documented here.

The project follows semantic versioning while it is in the `0.x` development series.

## [0.2.13]

- Added smart session-memory promotion with selective durable-fact extraction.
- Added token budgets for minimal, focused, and deep context modes.
- Added Architecture Guard warnings for rule violations, dangerous paths, destructive commands, and architecture conflicts.
- Added memory:review, guard inspection commands, and improved agent-facing safety context.
- Fixed formatting and CI quality-gate failures introduced during the new guard and session-memory work.

## [0.2.12]

- Added configurable context token budgets to prevent excessive prompt injection.
- Added minimal, focused, and deep context modes.
- Limited automatic agent startup context to small local project context.
- Prevented automatic deep-recovery, transcript, and remote-storage dumps at startup.
- Added selective session-memory extraction and promotion infrastructure.

## [0.2.11]

- Added fast local project context for agent startup.
- Changed the default toolnet-memory command to print fast project context instead of generic help.
- Added profile:show and profile:sync.
- Added generated GEMINI.md, AGENTS.md, and CLAUDE.md agent instruction support.
- Added transcript noise filtering for system messages, tool logs, npm output, repeated output, and sensitive values.
- Improved deep-recovery progress reporting and reduced default recovery scope.

## [0.2.10]

- Added Cloudflare R2 as the recommended storage backend.
- Added generic S3 / S3-compatible storage support.
- Added fully local storage support.
- Retained Hugging Face S3 as a legacy-compatible provider.
- Hardened npm installer networking for dual-stack and unreliable IPv6 VPS environments.

## [0.2.9]

- Added native parsing for Agy / Antigravity nested hook payloads.
- Preserved compatibility with legacy flat camelCase and snake_case hook payloads.
- Restored the production installer UI with progress stages and non-interactive fallback behavior.
- Hardened installer version resolution so a slow npm metadata lookup does not block installation indefinitely.

## [0.2.8]

- Strengthened Agy startup context injection through `userMessage` injection steps.
- Improved work-continuity context supplied to new coding-agent sessions.

## [0.2.7]

- Improved automatic Agy session context injection and session startup ordering.

## [0.2.6]

- Added automatic coding-agent integration with `integrate:auto`.
- Added production integrations for Agy / Antigravity, OpenCode, and Codex.
- Added automatic session-memory hooks and context restoration infrastructure.

## [0.2.5]

- Hardened production package/runtime behavior.
- Improved bundled runtime packaging and production command paths.
- Improved clean-install compatibility on supported Linux environments.

## [0.2.x]

Earlier `0.2.x` releases introduced and expanded:

- stable per-project identity and storage isolation,
- Hugging Face S3-backed project namespaces,
- persistent project memory and work continuity,
- code indexing, rich graph, semantic search, architecture analysis, and impact analysis,
- snapshots and recovery,
- MCP integration,
- `doctor`, configuration, and update commands,
- project operating manuals and structured handoff context.

## [0.1.0]

- Initial production release of ToolNet Memory.
- Persistent project memory, storage, retrieval, and core coding-agent support.

[0.2.9]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.9
[0.1.0]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.1.0
[0.2.13]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.13
[0.2.12]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.12
[0.2.11]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.11
[0.2.10]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.10
