<div align="center">

# ToolNet Memory

### Persistent project memory, work continuity, and code intelligence for AI coding agents

[![npm](https://img.shields.io/npm/v/toolnet-memory?style=flat-square)](https://www.npmjs.com/package/toolnet-memory)
[![CI](https://github.com/LBT-AI/toolnet-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/LBT-AI/toolnet-memory/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**One project. Multiple coding agents. Continuous context.**

</div>

---

## What is ToolNet Memory?

ToolNet Memory is a persistent project-memory and code-intelligence layer for AI coding agents.

It keeps project knowledge outside a single chat/session so supported agents can move between sessions without rebuilding project context from zero.

ToolNet Memory combines four layers:

- **Fast project context** — local startup context with no deep recovery.
- **Work continuity** — current goal, task, phase, blockers, decisions, and next actions.
- **Durable memory** — filtered project knowledge that survives agent/session changes.
- **Code intelligence** — symbols, dependencies, call relationships, architecture, impact analysis, semantic search, and graph visualization.

ToolNet Memory is **not a raw transcript dump**. Session history and durable project memory are kept separate, filtered, bounded, and selectively promoted.

---

## Quick Start

### 1. Install once per VPS / user

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

### 2. Configure ToolNet once

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

### 4. Build project intelligence once

```bash
toolnet-memory index
```

The full index builds:

```text
Scanning files
    ↓
Parsing code
    ↓
Type Resolution
    ↓
Rich Graph
    ↓
Semantic Code Index
    ↓
Architecture Intelligence
    ↓
Graph Analysis
    ↓
3D Visualization Dataset
```

After the first full index, use incremental indexing for normal changes:

```bash
toolnet-memory incremental
```

---

## Normal Daily Workflow

In normal use, users should not need to manually load large session histories.

```text
Open project
    ↓
Agent detects ToolNet project
    ↓
Fast local context loads
    ↓
Agent continues current work
    ↓
ToolNet captures meaningful continuity
```

Fast context can be viewed manually with:

```bash
toolnet-memory
```

or:

```bash
toolnet-memory context
```

The default startup context is intentionally small and local. Deep recovery is reserved for cases where fast context is insufficient.

---

## Switching Between Coding Agents

ToolNet Memory is designed for workflows such as:

```text
OpenCode → Agy / Antigravity → Codex → Claude Code → Kiro CLI → Cursor CLI → GitHub Copilot CLI → Grok Build
```

The next agent should receive the same project continuity instead of starting from zero.

Typical continuity includes:

```text
Last agent
Last session
Current request
Current activity
Goal
Plan
Current phase
Blockers
Decisions
Next actions
```

Supported integrations currently include:

```bash
toolnet-memory integrate:auto
toolnet-memory integrate:agy
toolnet-memory integrate:opencode
toolnet-memory integrate:codex
toolnet-memory integrate:claude
toolnet-memory integrate:kiro
toolnet-memory integrate:cursor
toolnet-memory integrate:copilot
toolnet-memory integrate:grok
```

Cursor CLI, GitHub Copilot CLI, and Grok Build use the same shared ToolNet
continuity layer. Their integrations register ToolNet MCP plus lifecycle capture/
continuity guards; Grok also installs the ToolNet continuity skill.

Detect integrations without modifying configuration:

```bash
toolnet-memory integrate:detect
```

### Kiro CLI

ToolNet Memory integrates with Kiro through MCP and lifecycle hooks.

````bash
toolnet-memory integrate:kiro
toolnet-memory integrate:kiro --status

Kiro receives compact ToolNet startup context, cross-agent continuity through memory_agent_ask, local WAL capture, final Stop flush, and raw-session-history protection through PreToolUse.

Kiro uses the shared ToolNet continuity core and does not maintain a separate memory database.

ToolNet Memory also exposes an MCP server:

```bash
toolnet-memory mcp
````

---

## Project Operating Manual

Every project can define persistent mandatory rules in:

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

This is the correct place for rules such as:

- allowed source path,
- development vs production environment,
- deployment commands,
- files that must not be edited,
- verification requirements,
- architecture constraints.

Secrets and credentials should remain in `.env` or another secret store, not in `PROJECT.md`.

---

## Code Intelligence

ToolNet Memory builds a persistent structural model of the project so coding agents can understand relationships before changing code.

Capabilities include:

- source symbol indexing,
- imports and dependencies,
- callers and callees,
- type relationships,
- architecture layers,
- subsystem clustering,
- hotspots,
- dead-code candidates,
- semantic code search,
- dependency paths,
- change-impact analysis,
- visualization datasets.

Useful commands:

```bash
# Full index
toolnet-memory index

# Incremental update
toolnet-memory incremental

# Semantic search
toolnet-memory semantic "authentication flow"

# Change impact
toolnet-memory impact src/auth.ts
```

The goal is not only to find code, but to help an agent understand **what may break if a file, symbol, or dependency changes**.

---

## Code Graph UI

ToolNet Memory includes a project graph visualization UI.

Start it with:

```bash
toolnet-memory graph
```

The graph uses real indexed ToolNet project data.

For large projects, the UI uses a lightweight drill-down flow instead of rendering the complete symbol graph at once:

```text
Overview
  ↓
Subsystems
  ↓
Files
  ↓
Symbols + relationships
```

This keeps the graph usable on large projects and mobile browsers while preserving access to detailed relationships when needed.

The graph server defaults to:

```text
127.0.0.1:9749
```

To expose it temporarily on a VPS network interface:

```bash
TOOLNET_GRAPH_HOST=0.0.0.0 \
TOOLNET_GRAPH_PORT=9749 \
toolnet-memory graph
```

---

## Memory and Work Continuity

View the current work state:

```bash
toolnet-memory work
```

or:

```bash
toolnet-memory work:status
```

Ask project memory directly:

```bash
toolnet-memory ask "What was changed in the authentication flow?"
```

Review or reconcile durable memory:

```bash
toolnet-memory memory:review
toolnet-memory memory:reconcile
```

ToolNet tracks structured continuity such as:

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

### Fast Context — default

Fast context is local, bounded, and intended for normal agent startup.

```bash
toolnet-memory
toolnet-memory context:print
```

It uses project-local ToolNet files and does not automatically dump remote history into the prompt.

### Deep Recovery — manual only

Use deep recovery only when the normal fast context is not enough.

```bash
toolnet-memory brief
toolnet-memory handoff:latest
toolnet-memory session:agy-recover
toolnet-memory session:codex-recover
toolnet-memory session:opencode-recover
```

These commands are intentionally **not** meant to run automatically on every agent startup.

---

## AI Providers and Models

ToolNet separates the reasoning model from the embedding model.

Run interactive setup:

```bash
toolnet-memory setup
```

View provider state:

```bash
toolnet-memory provider
toolnet-memory provider:list
toolnet-memory provider:status
toolnet-memory provider:test llm
toolnet-memory provider:test embedding
```

View or change the active model:

```bash
toolnet-memory model
toolnet-memory model status
toolnet-memory model list
toolnet-memory model set <model>
```

Canonical configuration uses:

```text
TOOLNET_LLM_PROVIDER
TOOLNET_LLM_API_KEY
TOOLNET_LLM_BASE_URL
TOOLNET_LLM_MODEL

TOOLNET_EMBEDDING_PROVIDER
TOOLNET_EMBEDDING_API_KEY
TOOLNET_EMBEDDING_BASE_URL
TOOLNET_EMBEDDING_MODEL
```

Optional LLM fallbacks are supported for transient failures such as timeouts, HTTP 408, 429, and 5xx responses.

---

## Storage

Supported storage modes include:

- Cloudflare R2,
- generic S3 / S3-compatible storage,
- local storage,
- Hugging Face S3 compatibility mode.

Projects remain isolated by stable ToolNet project identity.

A typical remote layout is:

```text
projects/<project>/
├── memory/
├── code/
├── sessions/
├── work/
└── snapshots/
```

Project identity is stored locally under:

```text
.toolnet/project.json
```

Renaming or moving a project directory should not cause unrelated projects to share memory.

---

## Snapshots and Recovery

Create and restore project-scoped snapshots:

```bash
toolnet-memory snapshot:list
toolnet-memory snapshot:create "before refactor"
toolnet-memory snapshot:restore <id>
toolnet-memory recover
```

---

## Architecture Guard

ToolNet can evaluate project rules and potentially dangerous changes.

```bash
toolnet-memory guard:check
toolnet-memory guard:check --file src/path.ts
toolnet-memory guard:check --command "rm -rf ..."
toolnet-memory guard:explain
```

The project manual and guard system are intended to reduce accidental violations of important project constraints.

---

## Background Service

ToolNet can optionally run a background daemon:

```bash
toolnet-memory service:install
toolnet-memory service:start
toolnet-memory service:status
toolnet-memory service:restart
toolnet-memory service:stop
toolnet-memory service:remove
```

The background service is optional; the core CLI does not require a permanent daemon for every workflow.

---

## CLI Help

The default help is intentionally compact:

```bash
toolnet-memory help
```

Show every command:

```bash
toolnet-memory help --all
```

Show help for one command:

```bash
toolnet-memory help index
toolnet-memory help model
toolnet-memory help graph
```

Main user-facing commands:

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

AI
  model
  provider

SYSTEM
  status
  update
```

Advanced, recovery, service, session, and production commands remain available through `help --all`.

---

## Health and Status

Quick status:

```bash
toolnet-memory status
```

Deeper diagnostics:

```bash
toolnet-memory doctor
```

Configuration:

```bash
toolnet-memory config get KEY
toolnet-memory config set KEY VALUE
toolnet-memory config open
```

Secret values are masked in normal CLI output.

---

## Updating

```bash
toolnet-memory update
```

Or reinstall the latest npm release:

```bash
npm install -g toolnet-memory@latest
```

---

## Security Model

ToolNet Memory processes source-code metadata, project instructions, agent activity, and durable memory.

Important rules:

- Never commit `.env` files or credentials.
- Keep VPS passwords, API keys, and tokens out of `PROJECT.md`.
- Sanitize secrets before durable persistence.
- Never inject memory from another project.
- Treat raw coding-agent transcripts as sensitive.
- Keep deep recovery manual and bounded.
- Store global ToolNet credentials outside project repositories.

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

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules.

---

## Releases

ToolNet Memory uses GitHub Actions for CI and npm releases.

Before a release, the repository validates:

```text
lint
format
TypeScript
unit/integration tests
production build
npm package contents
```

Version tags trigger the release workflow and npm Trusted Publishing.

The tag must match `package.json`:

```text
package.json: 0.3.x
Git tag:      v0.3.x
```

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

MIT © 2026 LBT-AI. See [LICENSE](LICENSE).
