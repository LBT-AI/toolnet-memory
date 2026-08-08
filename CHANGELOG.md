# Changelog

All notable changes to ToolNet Memory are documented here.

The project follows semantic versioning while it is in the `0.x` development series.

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
