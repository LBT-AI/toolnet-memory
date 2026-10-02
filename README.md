<div align="center">

# ToolNet Memory

### Persistent project memory, work continuity, and code intelligence for AI coding agents

[![npm](https://img.shields.io/npm/v/toolnet-memory?style=flat-square)](https://www.npmjs.com/package/toolnet-memory)
[![CI](https://github.com/LBT-AI/toolnet-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/LBT-AI/toolnet-memory/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**One project. Multiple coding agents. Continuous context.**

Current release: **v0.6.1**

</div>

---

## What is ToolNet Memory?

ToolNet Memory is a persistent memory, continuity, and code-intelligence layer for AI coding agents.

It keeps project knowledge outside a single chat or session so supported coding agents can continue the same work without rebuilding context from zero.

ToolNet Memory combines four layers:

- **Fast project context** — small local startup context for normal work.
- **Work continuity** — current goal, phase, blockers, decisions, and next actions.
- **Durable memory** — filtered project knowledge that survives agent/session changes.
- **Code intelligence** — symbols, dependencies, call graphs, architecture, local SQLite FTS5/BM25 code search, impact analysis, and graph visualization.

ToolNet Memory is **not a raw transcript dump**. Raw session history is kept separate from durable project memory and is protected from normal agent reads.

Memory promotion, retrieval, conflict handling, and continuity decisions are deterministic and local. ToolNet Memory does not require an LLM or embedding provider for its memory runtime.

### v0.3.15 hardening

v0.3.15 strengthens the existing local-first architecture without adding an LLM, embedding provider, vector database, or encryption-key requirement.

- Safe retention / garbage collection with dry-run by default.
- Project-scoped cross-process and shared-volume container hook deduplication.
- Large-repository scanner limits, bounded indexing concurrency, cancellation, and conservative rename detection.
- Explicit TypeScript/JavaScript parser capability reporting and TypeScript monorepo/path-alias resolution.
- Incremental graph repair with dangling-edge protection.
- Secret Scanner v2 and one durable-data sanitization contract.
- Strict existing-project resolution for read/query commands.
- Repository instruction content is treated as untrusted project data rather than system authority.
  Garbage collection is non-destructive by default:

```bash
toolnet-memory gc
```

Actual cleanup requires explicit application:

```bash
toolnet-memory gc --apply
```

---

### v0.4.0 Persistent Shared Tasks

v0.4.0 adds a durable project-shared Task execution layer for coding agents.

- Goal → Task → Subtask hierarchy.
- Deterministic Task lifecycle and revision guards.
- Progress, blockers, dependencies, evidence, tests, touched files, and next actions.
- Multi-agent claim leases, heartbeat, release, handoff, and expired-lease takeover.
- Deterministic `claimNext()` and resume-state continuity.
- Task CLI and MCP tools.
- Read-only authenticated Tasks Panel in the Graph UI.
- Automatic file, test, verification, and Git commit evidence for claimed Tasks.
- Automatic evidence never completes Tasks and never stores raw command output.
- The Task runtime remains local-first and deterministic with no LLM, embeddings, or vector database requirement.

### v0.5.1 Persistent Tasks GA + Memory Quality

v0.5.1 completes the production Persistent Tasks architecture and the Memory Quality roadmap.
Persistent Tasks:

- Provider-native plan/TODO mirroring into one canonical Task system.
- Stable mirror identity and binding across supported coding agents.
- Append-only Task operation log with rebuildable projections.
- Deterministic Task lifecycle, dependencies, progress, blockers, evidence, files, tests, and next actions.
- Immutable completion snapshots.
- Multi-agent claim leases, heartbeat, release, handoff, and recovery.
- Dependency-aware scheduling and bounded parallel execution coordination.
- Cross-host immutable operation replication without distributed locks.
- Deterministic multi-host convergence.
- Replication conflict explainability with `task:conflicts --explain`.
- Crash recovery and Task projection self-healing.
- Three-host divergence/convergence and restart E2E certification.
  Memory Quality:
- Explicit long-term rule vs observation/history scope.
- Timestamps, confidence, verification state, and derived freshness.
- Task-first Current Work Projection v2.
- Structured artifact evidence for backups, reports, builds, deployments, SEO audits, crawler output, releases, and verification.
- Separate `planned`, `executed`, `verified`, and `failed` artifact states.
- Startup context noise filtering and bounded ranking.
- Read-only `memory:review` quality inspection.
- Memory Quality and active Artifact Path health in `doctor`.
- Stale historical work remains searchable but is not automatically injected as current work.
  Architecture:
- `docs/architecture.md` documents Session WAL → Task Mirror → Persistent Task Core → Replication → Current Work → CLI/MCP.
- Persistent Tasks remain execution authority.
- Current Work and Task `state.json` remain rebuildable projections rather than independent sources of truth.

### v0.5.2 Retrieval GA

v0.5.2 completes the intent-aware retrieval roadmap and promotes the retrieval runtime to GA.

- Deterministic intent-aware routing before source retrieval.
- Composite retrieval planning for multi-intent questions with a hard three-source budget.
- Persistent Tasks remain execution authority.
- Task Artifact Evidence remains authoritative for production execution and verification state.
- Fresh verified Memory is separated from stale historical Memory.
- Persisted Code Intelligence uses the existing local SQLite FTS5/BM25 index.
- Fixed bilingual retrieval quality benchmark with precision, recall, F1, source-cost, and regression gates.
- 65-case hardened production benchmark covering paraphrase, ambiguity, negation, punctuation, composite routing, and budget pressure.
- Privacy-safe local retrieval telemetry with no question, answer, file path, Task ID, source reference, or query hash storage.
- Explicit benchmark-gated adaptive routing with minimum support and agreement requirements.
- Bad adaptive rules are rejected without replacing previously approved rules.
- CLI and MCP use the same planner, authority rules, feedback layer, and telemetry model.
- Retrieval remains local and deterministic with no LLM or embedding requirement.
- Production certification is release-blocking and executes before npm publication.

### v0.5.3 Disaster Recovery

- Adds Phase 67 backup, restore, and disaster-recovery certification.
- Backs up authoritative Task operations, per-source Session WALs, retrieval advisory state, and the complete remote project namespace.
- Adds SHA-256 integrity verification for every backup object plus the recovery manifest.
- Restore is dry-run by default and always creates a pre-restore safety backup before apply.
- Rebuilds Task projection and shared Session journal from authoritative logs.
- Remote restore is additive and never deletes newer immutable operations.
- Production certification now includes the Phase 67 disaster-recovery gate.

### v0.6.1 Release Repair

- Fixes npm 12 compatibility in the release package audit (`npm pack --json` now returns a name-keyed object), with normalized paths, duplicate detection and fail-closed behavior on malformed output.
- Fixes the `linux/arm64` container build by installing the native build toolchain in the Docker builder stage only; the runtime image stays minimal.
- Pins the npm version used by the release pipeline so publishing stays deterministic.

### v0.6.0 Code Intelligence, Daemon & Release Engineering

- Adds code-intelligence graph trust and coverage reporting, multi-language structural parsing, deterministic symbol resolution, graph semantics v2, and cross-service/cross-repository (Fleet) intelligence.
- Adds a versioned graph query/schema surface, Architecture Decision Records, and portable shared graph artifacts.
- Adds a local coordination daemon with a build/protocol admission barrier and deterministic restart ordering during upgrades.
- Adds evidence profiles and runtime trace evidence, plus change, contract, test, and release-readiness intelligence tools.
- Adds install/upgrade/migration intelligence: storage compatibility classification, upgrade orchestration, packaged build identity, upgrade recovery, and live daemon upgrade handling.
- Unifies build identity across the dispatcher, standalone binary, and daemon.
- Purely additive from v0.5.3 with no public breaking changes; authority stores are protected by backup/verify and derived stores are rebuilt when required.

## Supported Coding Agents

ToolNet Memory currently supports a 22-agent continuity ring:

```text
Claude Code
Cursor CLI
GitHub Copilot CLI
Grok Build
Kiro CLI
OpenCode
Codex
Agy / Antigravity
ToolNet CLI
Kilo
goose
Qwen Code
Kimi Code CLI
Hermes Agent
Qoder CLI
Aider
Plandex
OpenRouter CLI
IBM Bob Shell
Cline CLI
Rovo Dev CLI
Warp Agent CLI
```

Integration capability depends on what the host application actually exposes:

| Capability                 | Agents                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Native lifecycle / refresh | Codex, Agy / Antigravity, Kiro CLI, Claude Code, Cursor CLI, GitHub Copilot CLI, Grok Build, IBM Bob Shell, Cline CLI, Rovo Dev CLI |
| Persistent plugin refresh  | OpenCode                                                                                                                            |
| Managed wrapper            | Aider                                                                                                                               |
| Native session capture     | ToolNet CLI                                                                                                                         |
| Manual recovery            | Plandex                                                                                                                             |
| MCP continuity             | Kilo                                                                                                                                |
| Blocked / unresolved       | OpenRouter CLI (product identity unresolved), Warp Agent CLI (no native hook system)                                                |

ToolNet does not report lifecycle support unless the host exposes a genuine lifecycle integration.

A project can move between agents while keeping the same ToolNet work state and memory.

Typical continuity data includes:

```text
Current request
Current goal
Current task
Current phase
Recent decisions
Blockers
Warnings
Next actions
Last agent/session
```

---

## Quick Start

### 1. Install

```bash
curl -fsSL https://memory.toolnet.tech/install | bash
```

Or:

```bash
npm install -g toolnet-memory@latest
```

Requires **Node.js 22+**.

Verify:

```bash
toolnet-memory --version
toolnet-memory doctor
```

### 2. Configure

```bash
toolnet-memory setup
```

Global configuration is stored outside project repositories:

```text
~/.config/toolnet-memory/.env
```

### 3. Initialize a project

```bash
cd /path/to/project
toolnet-memory init
```

Project identity is stored in:

```text
.toolnet/project.json
```

For Git projects, new project identity is derived from normalized Git
repository identity instead of absolute checkout path.

A fresh clone can recover a registered existing ToolNet project identity from
the configured remote identity registry.

Pre-registry legacy projects require explicit adoption when identity cannot be
proven automatically:

```text
toolnet-memory init --adopt-remote <remote-name>
```

To intentionally initialize without remote identity lookup:

```text
toolnet-memory init --no-remote-identity
```

### 4. Build project intelligence

```bash
toolnet-memory index
```

The full index pipeline includes:

```text
Scanning files
    ↓
Parsing code
    ↓
Type Resolution
    ↓
Rich Graph
    ↓
Local Code Search — SQLite FTS5/BM25
    ↓
Architecture Intelligence
    ↓
Graph Analysis
    ↓
3D Visualization Dataset
```

After the first full index, normal code changes can use:

```bash
toolnet-memory incremental
```

---

## Daily Workflow

Normal startup is intentionally lightweight:

```text
Open project
    ↓
Agent loads ToolNet integration
    ↓
Fast local context is available
    ↓
Agent continues current work
    ↓
Meaningful continuity is captured
```

Useful commands:

```bash
# Fast project context
toolnet-memory context

# Current work state
toolnet-memory work

# Ask project memory
toolnet-memory ask "What changed in the authentication flow?"

# Project status
toolnet-memory status
```

Deep recovery is separate and is not automatically dumped into every prompt.

---

# Agent Integrations

Detect installed/supported coding agents:

```bash
toolnet-memory integrate:detect
```

Automatically configure detected integrations:

```bash
toolnet-memory integrate:auto
```

Manual integration commands:

```bash
toolnet-memory integrate:agy
toolnet-memory integrate:opencode
toolnet-memory integrate:codex
toolnet-memory integrate:claude
toolnet-memory integrate:kiro
toolnet-memory integrate:cursor
toolnet-memory integrate:copilot
toolnet-memory integrate:grok
toolnet-memory integrate:toolnet-cli
toolnet-memory integrate:kilo
toolnet-memory integrate:goose
toolnet-memory integrate:qwen
toolnet-memory integrate:kimi
toolnet-memory integrate:hermes
toolnet-memory integrate:qoder
toolnet-memory integrate:aider
toolnet-memory integrate:plandex
toolnet-memory integrate:openrouter
toolnet-memory integrate:bob
toolnet-memory integrate:cline
toolnet-memory integrate:rovo
toolnet-memory integrate:warp
```

---

## v0.3.11: Dual-Scope Integrations

Cursor CLI, GitHub Copilot CLI, and Grok Build support three explicit scopes:

```text
global
project
both
```

Examples:

```bash
# Global only
toolnet-memory integrate:cursor --scope global

# Project only
toolnet-memory integrate:cursor \
  --scope project \
  --project /path/to/project

# Global + project
toolnet-memory integrate:cursor \
  --scope both \
  --project /path/to/project
```

The same scope syntax is supported by:

```bash
toolnet-memory integrate:copilot ...
toolnet-memory integrate:grok ...
```

### Scope policy

`integrate:auto` uses a conservative policy:

| Current location                                      | Automatic scope |
| ----------------------------------------------------- | --------------- |
| Ordinary directory                                    | `global`        |
| Git repository without ToolNet initialization         | `global`        |
| Existing ToolNet project with `.toolnet/project.json` | `both`          |

ToolNet does **not** create `.cursor/`, `.github/`, or `.grok/` project configuration just because the current directory is a Git repository.

Explicit scope always wins:

```bash
toolnet-memory integrate:auto --scope global

toolnet-memory integrate:auto \
  --scope project \
  --project /path/to/project

toolnet-memory integrate:auto \
  --scope both \
  --project /path/to/project
```

---

## Cursor CLI

Install:

```bash
toolnet-memory integrate:cursor --scope global
```

Or for an initialized ToolNet project:

```bash
toolnet-memory integrate:cursor \
  --scope both \
  --project /path/to/project
```

ToolNet surfaces:

```text
Global MCP
  ~/.cursor/mcp.json

Project MCP
  <project>/.cursor/mcp.json

Global Hooks
  ~/.cursor/hooks.json

Project Hooks
  <project>/.cursor/hooks.json

Project Rule
  <project>/.cursor/rules/toolnet-memory.mdc
```

Project and global hook layers can both be active. ToolNet uses cross-process event deduplication to prevent duplicate capture.

---

## GitHub Copilot CLI

Install:

```bash
toolnet-memory integrate:copilot --scope global
```

Or:

```bash
toolnet-memory integrate:copilot \
  --scope both \
  --project /path/to/project
```

ToolNet surfaces:

```text
Global MCP
  ~/.copilot/mcp-config.json

Project MCP
  <project>/.github/mcp.json

Global Hooks
  ~/.copilot/hooks/toolnet-memory.json

Project Hooks
  <project>/.github/hooks/toolnet-memory.json

Project Instruction
  <project>/.github/instructions/toolnet-memory.instructions.md
```

ToolNet does not overwrite `.github/copilot-instructions.md`.

If both global and project MCP entries exist, the project ToolNet MCP is treated as the effective project-scoped configuration.

---

## Grok Build

Install:

```bash
toolnet-memory integrate:grok --scope global
```

Or:

```bash
toolnet-memory integrate:grok \
  --scope both \
  --project /path/to/project
```

ToolNet surfaces:

```text
Global MCP
  ~/.grok/config.toml

Project MCP
  <project>/.grok/config.toml

Global Hooks
  ~/.grok/hooks/toolnet-memory.json

Project Hooks
  <project>/.grok/hooks/toolnet-memory.json

Global Continuity Skill
  ~/.grok/skills/toolnet-continuity/SKILL.md

Project Continuity Skill
  <project>/.grok/skills/toolnet-continuity/SKILL.md
```

In a project, the project ToolNet MCP and project continuity skill are the effective project-scoped versions.

Grok command hooks for lifecycle events remain passive; continuity is provided through the ToolNet MCP and `toolnet-continuity` skill rather than pretending hook stdout is hidden model context.

---

## Unified Integration Status

Show Cursor, Copilot, and Grok scope state together:

```bash
toolnet-memory integrate:status --scope global
```

For a project:

```bash
toolnet-memory integrate:status \
  --scope both \
  --project /path/to/project
```

Filter one agent:

```bash
toolnet-memory integrate:status \
  --scope both \
  --project /path/to/project \
  --agent cursor
```

JSON output:

```bash
toolnet-memory integrate:status \
  --scope both \
  --project /path/to/project \
  --json
```

Status reports:

```text
Global configuration
Project configuration
Effective MCP scope
Effective hook scope
Effective rule/instruction/skill scope
Dedupe readiness
Trust requirement
Precedence/shadowing risk
Warnings
```

ToolNet does not claim that a workspace is natively trusted unless the host application proves it. Project trust is therefore reported conservatively as required/unverified when applicable.

---

## Cross-Process Hook Deduplication

When both global and project hooks are loaded by a host, the same native event may arrive through two hook processes.

ToolNet prevents double capture with a short-lived cross-process event claim keyed by agent, session, event, and stable native identity.

Examples of deduplicated events include lifecycle and prompt events.

Security enforcement such as raw-session-history protection is evaluated before deduplication so a second hook source cannot bypass policy checks.

---

## Kiro CLI

Kiro integrates through MCP and lifecycle hooks:

```bash
toolnet-memory integrate:kiro
toolnet-memory integrate:kiro --status
```

Kiro receives ToolNet continuity through the shared memory core and does not maintain a separate memory database.

---

## goose

goose integrates through native lifecycle hooks (`SessionEnd`, `Stop`):

```bash
toolnet-memory integrate:goose
toolnet-memory integrate:goose --status
```

ToolNet preserves existing goose hooks and writes only ToolNet-owned entries into the goose hooks configuration.

---

## Qwen Code

Qwen Code integrates through native lifecycle hooks (`SessionEnd`, `Stop`):

```bash
toolnet-memory integrate:qwen
toolnet-memory integrate:qwen --status
```

ToolNet preserves existing Qwen hooks and writes only ToolNet-owned entries into the Qwen hooks configuration.

---

## Kimi Code CLI

Kimi Code CLI integrates through native TOML lifecycle hooks (`SessionEnd`, `Stop`):

```bash
toolnet-memory integrate:kimi
toolnet-memory integrate:kimi --status
```

ToolNet preserves existing Kimi hooks and writes only ToolNet-owned entries into `~/.kimi-code/config.toml`.

---

## Hermes Agent

Hermes Agent integrates through native lifecycle hooks (`on_session_end`):

```bash
toolnet-memory integrate:hermes
toolnet-memory integrate:hermes --status
```

ToolNet preserves existing Hermes hooks and writes only ToolNet-owned entries into the Hermes config.

---

## Qoder CLI

Qoder CLI integrates through native lifecycle hooks (`SessionEnd`, `Stop`):

```bash
toolnet-memory integrate:qoder
toolnet-memory integrate:qoder --status
```

ToolNet preserves existing Qoder hooks and writes only ToolNet-owned entries into the Qoder settings.

---

## Aider

Aider integrates through a managed wrapper that captures session data at session end:

```bash
toolnet-memory integrate:aider
toolnet-memory integrate:aider --status
```

The wrapper launches Aider with a unique ToolNet-managed chat history file and captures only new session delta after the session ends.

---

## Plandex

Plandex currently supports manual recovery only:

```bash
toolnet-memory integrate:plandex
toolnet-memory integrate:plandex --status
toolnet-memory session:plandex-recover --project /path/to/project
```

Automatic capture is not yet available because Plandex plan state and session identity are not exposed through a stable verified native lifecycle hook.

---

## OpenRouter CLI

OpenRouter CLI product identity is currently unresolved. ToolNet does not auto-install an integration for an unidentified product.

```bash
toolnet-memory integrate:openrouter
toolnet-memory integrate:openrouter --status
```

If an official standalone OpenRouter CLI is released, this entry can be upgraded from `blocked-product-identity`.

---

## IBM Bob Shell

IBM Bob Shell integrates through native lifecycle hooks (`Stop`, `SessionStart`):

```bash
toolnet-memory integrate:bob
toolnet-memory integrate:bob --status
```

Bob's `Stop` hook fires after the final turn and sends JSON on stdin containing `event` and `session_id`. ToolNet writes a static hook command into Bob's settings and never mutates Bob's native session history.

---

## Cline CLI

Cline CLI integrates through native file hooks (`TaskStart`, `TaskComplete`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`):

```bash
toolnet-memory integrate:cline
toolnet-memory integrate:cline --status
```

ToolNet creates hook scripts in `.cline/hooks/` or `~/Documents/Cline/Hooks/` and captures only new session delta on task boundaries.

---

## Rovo Dev CLI

Rovo Dev CLI integrates through native event hooks (`on_tool_permission`, session-end-like events):

```bash
toolnet-memory integrate:rovo
toolnet-memory integrate:rovo --status
```

Rovo event hooks are currently a preview/experimental feature. ToolNet preserves existing Rovo config and writes only ToolNet-owned hook entries. Automatic capture is functional but may change when Atlassian stabilizes the hook API.

---

## Warp Agent CLI

Warp Agent CLI is currently `blocked-capability`. Warp tracks external CLI agents via OSC 777, but no official standalone lifecycle hook system for the Warp Agent CLI itself has been found.

```bash
toolnet-memory integrate:warp
toolnet-memory integrate:warp --status
```

Do not rely on automatic capture for Warp until a verified native hook or wrapper contract is available.

---

## MCP Server

Run the ToolNet MCP server directly:

```bash
toolnet-memory mcp
```

Core MCP capabilities include:

```text
memory_search
memory_save
memory_forget
project_context
code_search
semantic_code_search
find_symbol
find_callers
trace_calls
find_dependencies
analyze_impact
get_architecture
graph_path
graph_neighborhood
dead_code
snapshot_create
snapshot_list
snapshot_restore
memory_agent_ask
```

`memory_agent_ask` is the continuity-facing agent entry point used when an agent needs to recover or continue prior project work.

---

## Project Operating Manual

Projects can define persistent rules in:

```text
.toolnet/PROJECT.md
```

Create it with:

```bash
toolnet-memory project:manual-init
```

Example:

```md
# ToolNet Project Operating Manual

## Critical Rules

- [enforce] Only edit source code inside /root/project/source.
- [enforce] Never modify production files directly.
- [enforce] Deploy only with /root/project/deploy.sh --apply.
- [advisory] Prefer small focused changes.
```

ToolNet recognizes:

- `[enforce]` — mandatory project rule.
- `[advisory]` — project recommendation.

Show or sync the manual:

```bash
toolnet-memory project:manual-show
toolnet-memory project:manual-sync
```

Secrets and credentials should remain in `.env` or another secret store, not in `PROJECT.md`.

### Optional remote encryption

Remote S3 / R2 / Hugging Face objects can be encrypted client-side with
AES-256-GCM. Encryption remains disabled by default:

```bash
export TOOLNET_REMOTE_ENCRYPTION=on
export TOOLNET_REMOTE_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

Existing plaintext remote objects remain readable. New and rewritten
remote objects are encrypted while the feature is enabled. For services or
containers, `TOOLNET_REMOTE_ENCRYPTION_KEY_FILE` can load the key from a
protected file instead of placing the key directly in an environment
variable. See [`docs/remote-encryption.md`](docs/remote-encryption.md).

---

### Graph UI security

`toolnet-memory graph` remains localhost-first:

```text
127.0.0.1:9749
```

For remote exposure, Graph API endpoints support an optional bearer token:

```bash
export TOOLNET_GRAPH_TOKEN="$(openssl rand -hex 32)"
export TOOLNET_GRAPH_HOST="0.0.0.0"
toolnet-memory graph
```

The browser asks for the token when a protected Graph API returns HTTP 401 and
keeps it in sessionStorage for that browser session.

`/api/health` stays unauthenticated but returns only a minimal service status.

`TOOLNET_GRAPH_TOKEN` controls Graph API access only. It is not an encryption
key and is not required for normal localhost usage.

## Runtime Capability Truth

ToolNet Memory is local-first and deterministic.

| Component            | Required | Notes |
| -------------------- | -------- | ----- |
| LLM                  | no       |       |
| Embedding provider   | no       |       |
| Vector database      | no       |       |
| Mandatory crypto key | no       |       |

Automatic memory promotion and conflict handling are deterministic and evidence-based.

### Local Code Search

The current code-search implementation is:

```text
Local Code Search — SQLite FTS5/BM25
Index:   SQLite FTS5
Ranking: BM25
Mode:    lexical
```

It does not use embeddings or a vector database.

The following historical names remain compatibility aliases and are not being
removed in this release:

- `SemanticCodeEngine`
- `semantic_code_search`
- `toolnet-memory semantic`
- `semantic-index`

### Parser support

Two layers are always kept distinct:

- **Lexical search** — SQLite FTS5/BM25 over sanitized file chunks.
- **Structural graph** — AST-derived symbols, imports, calls, and heritage.

| Language family              | Lexical | Structural | Cross-file resolver |
| ---------------------------- | ------- | ---------- | ------------------- |
| TypeScript / TSX             | yes     | yes        | deterministic       |
| JavaScript / JSX / MJS / CJS | yes     | yes        | deterministic       |
| Python                       | yes     | yes        | deterministic       |
| Go                           | yes     | yes        | deterministic       |
| Rust                         | yes     | yes        | deterministic       |
| C                            | yes     | yes        | deterministic       |
| C++                          | yes     | yes        | deterministic       |

TypeScript/JavaScript use the TypeScript Compiler API. Python, Go, Rust, C, and
C++ use package-owned tree-sitter grammars. Grammar assets ship with the
package and are resolved offline — no grammar is downloaded at index time.

Parsing and resolution are separate capabilities. Resolution is deterministic:
every graph edge requires proven evidence (lexical scope, explicit import,
module target, receiver type, or inheritance). Identically named symbols are
never merged, ambiguous references stay unresolved, and no confidence score or
fuzzy matching is used. Graph coverage reflects that evidence, so a structural
negative claim is only reported as safe when the relevant capability is fully
resolved and fresh.

The authoritative graph has standardized edge semantics (`DEFINES`, `IMPORTS`,
`CALLS`, `CALL_REFERENCE`, `USES_TYPE`, `INHERITS`, `IMPLEMENTS`, `READS`,
`WRITES`, `HANDLES`, `CONFIGURES`). Each edge records its producer, evidence and
whether it is deterministic or a reference; `CALLS` means a proven callee,
`CALL_REFERENCE` means the runtime implementation is unknown. The graph is
validated and carries its own semantic fingerprint before it is persisted.
See [`docs/architecture.md`](docs/architecture.md).

Cross-service linkage is deterministic static analysis inside one project:
HTTP routes and clients, and event channels, are extracted from real syntax
and linked only when exactly one canonical endpoint matches. Two services
declaring the same `POST /orders` stay ambiguous with zero edges, dynamic URLs
stay unresolved, and credentials in URLs are redacted before anything is
retained. Cross-service relationships keep their own edge types
(`HTTP_CALLS`, `HANDLES`, `EMITS`, `LISTENS_ON`) — a caller is never linked
directly to a cross-service handler, and producers are never linked directly
to consumers.

| Language   | HTTP server                      | HTTP client        | Event channels        |
| ---------- | -------------------------------- | ------------------ | --------------------- |
| TypeScript | Express/Fastify/Koa/Hono, NestJS | `fetch`, `axios`   | `emit`/`on`           |
| Python     | FastAPI/Flask                    | `requests`/`httpx` | `emit`/`publish`/`on` |
| Go         | `net/http`, Gin/Echo/Fiber       | `http.Get/Post`    | `Publish`/`Subscribe` |

GraphQL, gRPC and tRPC are **not** linked in this phase. A service that
declares one of those frameworks is reported through
`UNSUPPORTED_SERVICE_FRAMEWORK` and its cross-service coverage is `partial`,
never silently treated as complete. No network request, DNS lookup, package
manager or source execution is performed.

Cross-repository relationships are a derived overlay, not a merged graph. A
Fleet contains only the ToolNet projects this install knows about; project
graphs stay isolated and are consumed through a minimal, sanitized export view.
Cross-project edges are deterministic (`CROSS_HTTP_CALLS`, `CROSS_EMITS`,
`CROSS_LISTENS_ON`, `CROSS_PACKAGE_DEPENDS_ON`) and carry evidence, never a
confidence score. Two repositories declaring the same endpoint with no host
evidence stay ambiguous with zero edges, event channels match only within the
same provider, and an external dependency is never mapped onto a project that
happens to share its name. Fleet generation is deterministic, stale projects
contribute no current links, and cross-repo impact is opt-in so local impact
semantics never change. Inspect it with `fleet_status` and `fleet_projects`,
and pass `includeCrossRepo: true` to `analyze_impact`.

Ad-hoc graph questions use **TGQL**, a bounded, read-only graph query subset
(`MATCH`, `WHERE`, `RETURN`, `ORDER BY`, `LIMIT`, `SKIP`) served by the
`query_graph` MCP tool. It queries either the current project graph (default)
or the Fleet overlay, and `get_graph_schema` publishes the machine-readable
node types, edge types, allowlisted properties, supported clauses and hard
limits. Mutation clauses (`CREATE`, `MERGE`, `DELETE`, `SET`, `REMOVE`, `DROP`,
`CALL`, `UNWIND`, `FOREACH`, `LOAD CSV`) are rejected before planning, values
are bound as parameters instead of string interpolation, and every traversal
is depth-, row- and expansion-bounded so it can be cancelled. Schema
vocabulary is reported honestly: edges with no producer yet (for example
`CROSS_RPC_CALLS`) stay queryable but are marked `status: "reserved"` and
`currentlyProduced: false`. Every result carries coverage metadata, and an
empty result is only a negative claim when `negativeClaimSafe` is true.

Architecture Decision Records capture the durable **why** behind the code.
Each ADR is a structured, project-scoped record (`ADR-0001`) with an explicit
lifecycle (`proposed`, `accepted`, `deprecated`, `superseded`, `rejected`), an
optimistic-concurrency revision, an append-only audit history and deterministic
supersession links. The structured store is the authority; Markdown is a
deterministic, server-controlled projection. Manage them with the `manage_adr`
MCP tool (`create`, `get`, `list`, `search`, `update`, `set_sections`,
`change_status`, `supersede`, `history`, `chain`, `export`, `import`): searches
are local lexical ranking (no embeddings, no vector database, no LLM), a stale
`expectedRevision` fails with `ADR_CONFLICT` instead of a silent
last-write-wins, and supersession cycles are rejected. Accepted ADRs that affect
the targeted files/symbols are surfaced by `project_context`
(`architectureDecisions`) and `analyze_impact` (`relevantADRs`) — as context,
never as impact calculation. Nothing is auto-accepted and no decision is ever
inferred from a conversation. See [`docs/adr.md`](docs/adr.md) for the
full operational contract.

A **portable code-intelligence artifact** lets a machine that already indexed a
repository hand its derived graph to another machine so it does not have to
re-parse. `manage_graph_artifact` (`status`, `publish`, `pull`, `verify`,
`list`, `prune`) builds an immutable generation, uploads it through the existing
storage provider (local, R2, S3 or legacy Hugging Face — with the retry and
client-side encryption wrappers reused unchanged) and only then moves the
current pointer. An artifact is **derived state**: it never carries or
overwrites memory, tasks, sessions, ADRs, the Wiki or the Project Manual, and
the fixed component table means archive bytes can never choose a write target.
Adoption is verify-first — schema and fingerprint compatibility, canonical
project identity, an exact hash-only source manifest match, SHA-256 of the
archive and of every component, then semantic graph validation — so a failed
pull leaves the current graph intact and falls back to local indexing. The local
FTS5/BM25 search cache is never shipped; it is rebuilt locally. No absolute path
or machine identity is ever persisted, so artifacts work across root paths, and
no LLM, embeddings or vector database is involved. See
[`docs/code-intelligence-artifacts.md`](docs/code-intelligence-artifacts.md) for
the full operational contract.

Agents sharing one machine also share one **local coordination daemon**. Instead
of every MCP session, CLI invocation and agent integration repeating an index, a
hydration and a graph build, they connect to a single local runtime over a Unix
domain socket (a named pipe on Windows) on a `0700` directory. One watcher runs
per project, indexing and artifact hydration are single-flight (ten sessions
asking at once cause one pass and one download, and zero parser invocations when
a compatible artifact exists), Fleet relinks are coalesced, and progress is fanned
out to subscribers. Exactly one daemon is elected per runtime identity through a
real instance lock that validates instance identity, not just a pid, so a reused
pid is treated as stale and an unrelated process is never killed. Admission is an
exact build barrier — protocol version, package version, build marker and every
schema fingerprint must match — and a mismatched daemon is reported, never killed.
The daemon is **runtime coordination only**: Memory, Tasks, the Task WAL,
Sessions, ADRs, the Wiki and the Project Manual stay in their own persistent
stores, and the daemon can be killed and restarted at any time. `daemon_status`
is the only MCP surface and it is read-only; start, stop and restart are trusted
local CLI actions (`toolnet-memory daemon status|start|stop|restart`). If the
daemon is unavailable, ToolNet falls back to an in-process runtime with identical
generation, coverage and query semantics. No public port, no remote protocol, no
LLM, no embeddings and no vector database. See
[`docs/local-daemon.md`](docs/local-daemon.md) for the full operational contract.

Finding a caller is not the same as proving there are no callers. **Evidence
profiles** make the required level of proof explicit: Scout is fast discovery
whose results are always `provisional`; Verify checks coverage, freshness and
pagination before a task-critical conclusion; Auditor is bounded exhaustive and is
required for absence, uniqueness, exhaustive and dead-code claims. `verify_evidence`
takes an explicit claim (`positive`, `negative`, `absence`, `uniqueness`,
`exhaustive`, `impact`, `dead_code`) and returns a structured bundle with
generation, per-capability coverage, bounded evidence, pagination state, a
source-fallback report for recorded gaps, unresolved/ambiguity counts and a
`claimSafety` decision (`allowed` / `provisional` / `blocked`) with reason codes.
Reserved edge vocabulary has no producer and can never ground an absence claim;
dead code is never automatically deletable; Auditor means bounded, not omniscient
— exceeding a limit reports `complete: false`, never a silent truncation. Source
fallback reads only the affected project file, refuses escapes and sensitive
files, executes nothing and makes no network calls. `query_graph` accepts an
optional `evidenceProfile`, and `get_graph_schema` reports which capabilities
each profile can use and what blocks an audit. Evidence is derived state and runs
through the shared runtime, so a daemon shares and single-flights identical
audits; bundles never touch Memory, Tasks, Sessions, the Task WAL or ADR
authority. No LLM, no embeddings and no vector database. See
[`docs/evidence-profiles.md`](docs/evidence-profiles.md) for the full contract.

### Cross-machine project identity

Existing `.toolnet/project.json` identity remains canonical.

New Git projects use normalized Git repository identity instead of absolute
checkout path. A registered existing ToolNet project can therefore be adopted
by another checkout of the same Git repository.

For a pre-registry legacy project, adoption is explicit:

```text
toolnet-memory init --adopt-remote <remote-name>
```

ToolNet refuses unverified silent adoption when repository identity cannot be
proven.

### Multi-host behavior

Cross-host convergence is implemented under `src/multi-host/**` using immutable
append-only operations plus deterministic reduction.

The removed legacy `src/sync/**` scaffold was not the active sync engine.

ToolNet does not claim a WebSocket real-time sync protocol or vector-clock CRDT
implementation.

### Storage truth

**Supported:**

- Local
- Hugging Face S3-compatible storage
- S3-compatible storage
- Cloudflare R2 through the S3-compatible provider

**Unsupported:**

- Google Drive storage
- GitHub storage backend

### Security truth

ToolNet provides secret scanning and durable-data sanitization.

ToolNet does not provide mandatory client-side encryption. Remote
client-side encryption is optional and disabled by default. Normal ToolNet
usage does not require an encryption key. When
`TOOLNET_REMOTE_ENCRYPTION=on` is configured together with
`TOOLNET_REMOTE_ENCRYPTION_KEY` (or the `_FILE` variant), ToolNet encrypts
new remote object writes with AES-256-GCM before they reach S3 / R2 /
Hugging Face storage. Existing plaintext remote objects remain readable.

See [`docs/remote-encryption.md`](docs/remote-encryption.md).

Project instruction files are treated as untrusted project data, not as system
or developer authority.

For the detailed capability matrix, see:

- `docs/runtime-truth.md`
- `docs/repository-capabilities.md`

---

## Code Intelligence

ToolNet builds a persistent structural model of the codebase.

Capabilities include:

- symbol indexing,
- imports and dependencies,
- callers and callees,
- type relationships,
- architecture layers,
- subsystem clustering,
- hotspots,
- dead-code candidates,
- local lexical code search (SQLite FTS5/BM25),
- dependency paths,
- change-impact analysis,
- visualization datasets.

### Local Code Search

ToolNet code search is deterministic and local.

```text
Index backend: SQLite FTS5
Ranking:       BM25
Mode:          lexical
Embeddings:    no
Vector DB:     no
LLM/model:     no
Network:       not required
```

The historical public names remain available for compatibility:

- CLI: `toolnet-memory semantic`
- MCP: `semantic_code_search`
- API: `SemanticCodeEngine`

Those names are compatibility aliases and do not indicate embedding-based semantic retrieval.

Useful commands:

```bash
# Full index
toolnet-memory index

# Incremental update
toolnet-memory incremental

# Local lexical code search (legacy command name)
toolnet-memory semantic "authentication flow"

# Change impact
toolnet-memory impact src/auth.ts
```

---

## Code Graph UI

Open the project graph:

```bash
toolnet-memory graph
```

For large projects the UI uses drill-down navigation:

```text
Overview
  ↓
Subsystems
  ↓
Files
  ↓
Symbols + relationships
```

Default address:

```text
127.0.0.1:9749
```

Optional VPS exposure:

```bash
TOOLNET_GRAPH_HOST=0.0.0.0 \
TOOLNET_GRAPH_PORT=9749 \
toolnet-memory graph
```

---

## Memory and Work Continuity

View current work:

```bash
toolnet-memory work
toolnet-memory work:status
```

Ask memory:

```bash
toolnet-memory ask "What was changed in the authentication flow?"
```

Review or reconcile durable memory:

```bash
toolnet-memory memory:review
toolnet-memory memory:reconcile
```

Recover ToolNet-owned session memory after an upgrade, crash or interrupted
materialization:

```bash
toolnet-memory memory:backfill --dry-run   # read-only: report state and pending work
toolnet-memory memory:backfill             # WAL -> learned journal -> canonical MemoryStore
```

`memory:backfill` reads only ToolNet-owned durable state (the local session WAL,
the immutable learned journal and the canonical MemoryStore). It never imports
another agent's native memory, never mutates Tasks, Wiki, Fleet or integration
config, and is idempotent: a second run is a no-op.

Structured continuity can include:

```text
Mission
Objective
Phase
Task
Deliverable
Definition of Done
Dependencies
Decisions
Blockers
Warnings
Next Actions
```

---

## Fast Context vs Deep Recovery

### Fast context

Used for normal startup:

```bash
toolnet-memory context
toolnet-memory context:print
```

It is local and bounded.

### Deep recovery

Use only when fast context is insufficient:

```bash
toolnet-memory brief
toolnet-memory handoff:latest
toolnet-memory session:agy-recover
toolnet-memory session:codex-recover
toolnet-memory session:opencode-recover
```

Deep recovery is intentionally not run automatically on every startup.

---

## Storage

Supported modes include:

- Cloudflare R2,
- generic S3 / S3-compatible storage,
- local storage,
- Hugging Face S3 compatibility mode.

A typical remote layout is:

```text
projects/<project>/
├── memory/
├── code/
├── sessions/
├── work/
└── snapshots/
```

Projects remain isolated by stable ToolNet project identity.

---

## Snapshots and Recovery

```bash
toolnet-memory snapshot:list
toolnet-memory snapshot:create "before refactor"
toolnet-memory snapshot:restore <id>
toolnet-memory recover
```

---

## Persistent Shared Tasks

ToolNet Memory now includes the core durable model for project-shared Goals, Tasks and Subtasks.

Authoritative task history is append-only:

```text
.toolnet/tasks/events.jsonl
```

A deterministic rebuildable projection is maintained at:

```text
.toolnet/tasks/state.json
```

Task ownership is project-wide rather than session-private. Agent identity is stored as attribution metadata and is not used to hide tasks from other agents.

Phase 33 establishes persistence, revision guards, local multi-process locking, crash-tail recovery and GC protection. Lifecycle rules, evidence, MCP/CLI and the Tasks panel are layered on top in subsequent phases.

See [docs/tasks-core.md](docs/tasks-core.md).

---

## Task State Engine

Persistent Shared Tasks now include deterministic execution state:

- lifecycle transitions,
- blockers,
- progress,
- dependencies,
- evidence,
- touched files,
- test history,
- next actions,
- deterministic resume state.

Parent task progress can be derived from direct child state, allowing a Tasks panel to render progress such as 5/10 without relying on an LLM.

Completion fails closed while blockers, open children, incomplete dependencies or incomplete explicit progress remain.

See [docs/task-state-engine.md](docs/task-state-engine.md).

---

## Architecture Guard

Evaluate project rules and potentially dangerous changes:

```bash
toolnet-memory guard:check
toolnet-memory guard:check --file src/path.ts
toolnet-memory guard:check --command "rm -rf ..."
toolnet-memory guard:explain
```

---

## Background Service

Optional daemon commands:

```bash
toolnet-memory service:install
toolnet-memory service:start
toolnet-memory service:status
toolnet-memory service:restart
toolnet-memory service:stop
toolnet-memory service:remove
```

The daemon is optional; the core CLI does not require a permanent background service.

---

## CLI Help

Compact help:

```bash
toolnet-memory help
```

All commands:

```bash
toolnet-memory help --all
```

One command:

```bash
toolnet-memory help index
toolnet-memory help model
toolnet-memory help integrate:cursor
```

Main commands:

```text
GET STARTED
  setup
  init
  doctor

MEMORY
  ask
  context
  work

CODE
  index
  semantic
  impact
  graph

INTEGRATIONS
  integrate:detect
  integrate:auto
  integrate:status
  integrate:cursor
  integrate:copilot
  integrate:grok

SYSTEM
  status
  update
```

---

## Updating

```bash
toolnet-memory update
```

Or:

```bash
npm install -g toolnet-memory@latest
```

---

## Security Model

ToolNet Memory processes source-code metadata, project instructions, agent activity, and durable memory.

Important rules:

- Never commit `.env` files or credentials.
- Keep passwords, API keys, and tokens out of `PROJECT.md`.
- Sanitize secrets before durable persistence.
- Never inject memory from another project.
- Treat raw coding-agent transcripts as sensitive.
- Keep deep recovery manual and bounded.
- Store global ToolNet credentials outside project repositories.
- Raw ToolNet session/history files are protected from normal agent access.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## Development

```bash
git clone https://github.com/LBT-AI/toolnet-memory.git
cd toolnet-memory
npm ci

npm run lint
npm run format:check
npm run typecheck
npm test
npm run build:release
npm pack --dry-run
```

Phase 07 integration certification:

```bash
npm run release:certify:phase07
```

10-agent continuity certification:

```bash
npm run release:certify:10
```

Optional native CLI E2E certification:

```bash
npm run release:certify:native:optional
```

Native Cursor/Copilot/Grok binaries are not required for normal package release certification.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules.

---

## Releases

ToolNet Memory uses GitHub Actions for CI and npm releases.

The current release line is:

```text
npm package: toolnet-memory@0.3.19
Git tag:     v0.3.14
```

Before release, the repository validates:

```text
lint
format
TypeScript
unit/integration tests
10-agent continuity
Phase 07 integration contracts
production build
npm package contents
```

Version tags trigger the Release workflow and npm Trusted Publishing.

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

MIT © 2026 LBT-AI. See [LICENSE](LICENSE).

Docker

ToolNet Memory includes a hardened Node.js 22 container build.

docker build -t toolnet-memory:local .
docker run --rm toolnet-memory:local --version

Run the daemon with persistent ToolNet runtime state:

docker run --rm \
-v toolnet-memory-home:/home/node/.toolnet \
toolnet-memory:local

Run against the current project:

docker run --rm \
-v "$PWD:/workspace" \
-v toolnet-memory-home:/home/node/.toolnet \
toolnet-memory:local \
doctor

The final image runs as a non-root user and the Docker health check uses the
ToolNet daemon's real Unix-socket ping protocol.

Release image target:

ghcr.io/lbt-ai/toolnet-memory

Optional Docker Hub publishing supports:

lbtai/toolnet-memory

when Docker Hub publishing is explicitly enabled in repository settings.

See docs/docker.md for Compose, shared-volume dedupe, permissions, health
checks, and multi-architecture release details.

Standalone binaries

ToolNet Memory can run without a separately installed Node.js/npm runtime.

Release targets:

Linux x64 / arm64
macOS x64 / arm64
Windows x64

Example:

```bash
chmod +x toolnet-memory-linux-x64
./toolnet-memory-linux-x64 --version
```

Standalone binaries embed the Node.js runtime and ToolNet production
dependency graph. The npm package remains fully supported.

See [`docs/standalone.md`](docs/standalone.md) for platform support,
service limitations, checksums, and build instructions.

Audit log and automatic GC

ToolNet can maintain a tamper-evident project audit history:

.toolnet/audit/events.jsonl

Inspect and verify:

```bash
toolnet-memory audit
toolnet-memory audit:verify
```

The log records durable memory writes, snapshot restore/recovery, Guard
checks, and GC execution without intentionally storing raw memory
content or raw shell commands.

Automatic GC remains opt-in:

```bash
export TOOLNET_AUTO_GC=on
toolnet-memory service
```

The default interval is weekly. Remote snapshot GC remains disabled
unless `TOOLNET_AUTO_GC_REMOTE=on` is explicitly configured.

See [`docs/audit-log.md`](docs/audit-log.md) and
[`docs/auto-gc.md`](docs/auto-gc.md).

Non-TypeScript code intelligence

Python, Go, Rust, C, and C++ are included in deterministic local code search
through sanitized file chunks indexed by SQLite FTS5/BM25, and are parsed
structurally with package-owned tree-sitter grammars.

Structural parsing does not by itself imply a complete cross-file call graph.
Cross-file symbol resolution for these languages is deterministic: references
are resolved through lexical scope, explicit imports, module targets, receiver
types and inheritance, and anything unproven stays unresolved. Graph coverage
guards structural negative claims until the relevant capability is fully
resolved and fresh.

```bash
toolnet-memory code:capabilities
```

Optional external LSP installations are detected for capability reporting
only. ToolNet does not auto-download or automatically execute language
servers during indexing.

See [`docs/non-ts-intelligence.md`](docs/non-ts-intelligence.md).

## Multi-Agent Task Handoff

Persistent Shared Tasks support execution leases and deterministic handoff
between agents.

An agent may claim a task, heartbeat the lease, release it or explicitly
transfer execution ownership to another agent without losing progress,
evidence, blockers or next-action continuity.

Expired leases can be taken over deterministically, and claimNext() skips
work actively owned by other agents while selecting the next dependency-ready
task.

This is same-project task coordination, not a remote object-storage distributed
lock.

See [docs/task-handoff.md](docs/task-handoff.md).

## Tasks Panel

The Graph UI includes a read-only Persistent Tasks panel.

It displays the current Task, progress such as 5/10, Goal/Task/Subtask
hierarchy, lifecycle state, blockers, next actions and active agent leases.

The browser reads a compact authenticated `/api/tasks` view and never accesses
or writes the raw Task operation log.

Task mutation remains available through the guarded CLI and MCP Task tools.

See [docs/tasks-panel.md](docs/tasks-panel.md).

## Automatic Task Evidence

When an agent holds a Persistent Task lease, ToolNet hooks can automatically
attach deterministic execution evidence to that Task.

Supported evidence includes changed project files, test PASS/FAIL results,
verification results and Git commit SHA references.

Attribution fails closed when the agent has multiple ambiguous Task leases.
Set `TOOLNET_TASK_ID` to select a Task explicitly.

Automatic evidence never completes Tasks and never stores raw command output.

See [docs/task-auto-evidence.md](docs/task-auto-evidence.md).
