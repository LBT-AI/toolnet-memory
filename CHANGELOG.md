# Changelog

All notable changes to ToolNet Memory are documented here.

The project follows semantic versioning while it is in the `0.x` development series.

## [0.3.15]

- Added safe retention and garbage collection with dry-run as the default and explicit --apply for deletion.
- Protected durable semantic memory, current work state, shared journal, unflushed WAL evidence, and append-only remote operations from generic GC.
- Moved hook deduplication to project-scoped runtime state for cross-process and shared-volume container coordination.
- Added atomic exclusive dedupe claims, ownership tokens, TTL recovery, bounded stale-marker cleanup, and project-aware event fingerprints.
- Added 10k / 50k / 100k large-repository benchmark profiles.
- Hardened code scanning with file-size limits, symlink protection, generated/dependency directory exclusion, cancellation, and bounded concurrency.
- Added conservative unique-content rename detection and correctness-first graph reconstruction for structural changes.
- Declared parser capabilities explicitly: TypeScript/JavaScript family uses the TypeScript Compiler API; Tree-sitter and Python/Go/Rust/C/C++ parsing remain unsupported.
- Added TypeScript paths, baseUrl, project references, and workspace-package module resolution.
- Added incremental graph repair with stable symbol remapping and dangling-edge protection.
- Added Secret Scanner v2 with additional provider credential patterns, limited entropy detection, allowlists, and hash false-positive protection.
- Unified durable-value sanitization for memory ingestion/import, session WAL persistence, and current work-state persistence.
- Added strict existing-project resolution so read/query commands never initialize or inherit an unrelated project implicitly.
- Marked repository/project instruction content as untrusted project data instead of system authority.
- Kept the runtime local-first with no LLM, embedding, vector database, or client-side encryption-key requirement.
- Preserved the existing storage implementation.

## [0.3.14]

- Reworked ToolNet Memory into a local-only deterministic memory and continuity runtime with no LLM or embedding dependency.
- Unified project memory across supported coding-agent runtimes instead of maintaining agent-specific memory silos.
- Added deterministic evidence-based memory promotion, conflict detection, and supersession rules.
- Hardened shared project journal writes, WAL recovery, corrupt-tail repair, and crash recovery.
- Added serialized local work-state updates for concurrent writers.
- Added append-only multi-host operation logs with deterministic memory and work projection convergence.
- Added background projection refresh for cross-host continuity.
- Added lifecycle-triggered refresh for Codex, Agy / Antigravity, Kiro CLI, Claude Code, Cursor CLI, GitHub Copilot CLI, and Grok Build.
- Added persistent periodic project refresh for OpenCode.
- Added ToolNet CLI native session capture with safe project binding, recovery, and watcher support without falsely claiming native lifecycle hooks.
- Kept Kilo MCP-only until a genuine native lifecycle integration is available.
- Hardened 10-agent integration capability reporting and shared continuity contracts.
- Removed AI, embedding, and vector runtime dependencies while retaining local BM25 / FTS-based retrieval.
- Preserved remote storage compatibility without changing the storage implementation.
- Fixed initialization output so all supported coding agents display their correct integration names.

## [0.3.7]

- Redesigned the CLI help system with a compact default view, full advanced help, and per-command help.
- Added friendly context, work, provider, model, status, and graph command UX while preserving existing commands.
- Added packaged `toolnet-memory graph` production support with the existing ToolNet Code Graph UI and required web assets.
- Optimized the Graph UI for large projects using persisted visualization data and Overview → Files → Symbols drill-down.
- Reduced default mobile graph rendering from full symbol/relationship graphs to lightweight subsystem views.
- Preserved project isolation and real ToolNet indexed graph data.

## [0.2.17]

- Added Codex fast local-only SessionStart context and dedicated fast handoff cache.
- Added automatic current work state and stable cross-session TODO/phase tracking.
- Added session-origin metadata for previous agent, session, task, file, blocker, decision, and next action handoff.
- Added concise local memory queries and the AI-powered ToolNet Memory Agent.
- Exposed `memory_agent_ask` through MCP for coding agents.
- Added agent guidance for automatic memory queries in continuity scenarios.
- Added automatic MCP registration for Codex, Agy / Antigravity, and OpenCode.
- Preserved existing agent MCP servers, providers, permissions, and configuration entries during integration.

## [0.2.16]

- Added interactive multi-provider Storage and AI setup.
- Added canonical TOOLNET_LLM_* and TOOLNET_EMBEDDING_* configuration.
- Added DeepSeek and NVIDIA NIM providers.
- Separated LLM and embedding providers.
- Added Gemini embedding support.
- Added provider list, status, test, and LLM-aware doctor diagnostics.
- Added Primary -> Fallback 1 -> Fallback 2 resilient LLM routing.
- Added bounded retries, cooldowns, and transient-error failover.
- Added safe legacy-provider configuration migration.
- Improved final setup summary and multi-provider documentation.

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

[0.2.17]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.17
[0.2.16]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.16
[0.2.9]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.9
[0.1.0]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.1.0
[0.2.13]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.13
[0.2.12]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.12
[0.2.11]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.11
[0.2.10]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.2.10
[0.3.7]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.3.7
[0.3.14]: https://github.com/LBT-AI/toolnet-memory/releases/tag/v0.3.14
