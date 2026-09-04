<div align="center">

# ToolNet Memory

### Persistent project memory, work continuity, and code intelligence for AI coding agents

[![npm](https://img.shields.io/npm/v/toolnet-memory?style=flat-square)](https://www.npmjs.com/package/toolnet-memory)
[![CI](https://github.com/LBT-AI/toolnet-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/LBT-AI/toolnet-memory/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**One project. Multiple coding agents. Continuous context.**

Current release: **v0.4.0**

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

## Supported Coding Agents

ToolNet Memory currently supports a 10-agent continuity ring:

```text
Agy / Antigravity
OpenCode
Codex
Claude Code
Kiro CLI
Cursor CLI
GitHub Copilot CLI
Grok Build
ToolNet CLI
Kilo
```

Integration capability depends on what the host application actually exposes:

| Capability                 | Agents                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Native lifecycle / refresh | Codex, Agy / Antigravity, Kiro CLI, Claude Code, Cursor CLI, GitHub Copilot CLI, Grok Build |
| Persistent plugin refresh  | OpenCode                                                                                    |
| Native session capture     | ToolNet CLI                                                                                 |
| MCP continuity             | Kilo                                                                                        |

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

| Language family              | Status      |
| ---------------------------- | ----------- |
| TypeScript / TSX             | supported   |
| JavaScript / JSX / MJS / CJS | supported   |
| Python                       | unsupported |
| Go                           | unsupported |
| Rust                         | unsupported |
| C / C++                      | unsupported |

The supported TypeScript/JavaScript family uses the TypeScript Compiler API.

Tree-sitter is not implemented in this release.

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

Non-TypeScript local code search

Structural graph parsing remains TypeScript/JavaScript-only.

Python, Go, Rust, C, and C++ files are now included in deterministic local
code search through sanitized file chunks indexed by SQLite FTS5/BM25.

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
