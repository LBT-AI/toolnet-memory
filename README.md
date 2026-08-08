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

## What it does

ToolNet Memory is a persistent memory layer for AI coding workflows. It keeps project knowledge outside any single agent session so Agy / Antigravity, OpenCode, Codex, and MCP-compatible tools can continue work without rebuilding context from zero.

It stores durable working context such as:

- project mission and current objective,
- decisions, rules, blockers, warnings, and next actions,
- completed and active work,
- structured session handoff state,
- semantic project/code context,
- source symbols, dependencies, architecture, and impact relationships.

ToolNet Memory is **not a raw transcript dump**. Session history and durable project memory are treated separately, and only useful project context should be promoted into long-term memory.

## Installation

ToolNet Memory is installed **once per VPS/user account**, not once per project.

Recommended installer:

```bash
curl -fsSL https://memory.toolnet.tech/install | bash
```

Alternative installer:

```bash
npx toolnet-memory-install
```

Or install directly from npm:

```bash
npm install -g toolnet-memory@latest
```

Requires **Node.js 22+**.

Verify:

```bash
toolnet-memory --version
toolnet-memory doctor
```

## One-time VPS setup

Global configuration is stored at:

```text
~/.config/toolnet-memory/.env
```

Run setup once on a new VPS/user account:

```bash
toolnet-memory setup
```

The setup flow can configure Hugging Face-backed storage and detect supported coding agents. Credentials stay outside project repositories and must never be committed.

## Per-project setup

Each source project gets a stable identity and isolated remote namespace.

```bash
cd /path/to/project

toolnet-memory project:manual-init --project "$PWD"
toolnet-memory index
```

ToolNet creates project metadata under:

```text
.toolnet/
```

A stable project identity prevents memory from being mixed merely because folders are renamed or moved.

Remote storage is scoped by project:

```text
projects/<project-remote>/
├── memory/
├── code/
├── sessions/
├── work/
└── snapshots/
```

## Agent integration

Automatic integration can detect supported agents installed for the current user:

```bash
toolnet-memory integrate:auto
```

Or integrate individually:

```bash
toolnet-memory integrate:agy
toolnet-memory integrate:opencode
toolnet-memory integrate:codex
```

Integration is normally a **one-time user/VPS operation**. Project selection remains automatic through the project's ToolNet identity.

After setup, use your coding agent normally:

```text
Agy / Antigravity ─┐
OpenCode            ├──> ToolNet Memory ──> Project-scoped context
Codex               ┘
```

The intended normal workflow does not require users to manually say “save memory” or “load memory”. Agent/session hooks capture meaningful activity and restore relevant project context at the next session.

## Core capabilities

### Persistent project memory

Durable memory can preserve decisions, rules, todos, fixes, blockers, warnings, architecture changes, and next actions while avoiding unnecessary transcript noise.

### Work continuity

Structured continuity can track:

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

Useful commands:

```bash
toolnet-memory work:status
toolnet-memory brief
toolnet-memory handoff:latest
```

### Code intelligence

A full index can build:

```text
Source Index
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
Visualization Dataset
```

Capabilities include symbol indexing, callers/callees, imports, type resolution, architecture layers, subsystem clusters, hotspots, dead-code candidates, semantic search, dependency analysis, and change-impact analysis.

Examples:

```bash
toolnet-memory semantic "authentication flow"
toolnet-memory impact src/path/to/file.ts
toolnet-memory incremental
```

### MCP

Expose memory and code intelligence through MCP:

```bash
toolnet-memory mcp
```

### Snapshots and recovery

ToolNet supports project-scoped snapshots and recovery workflows without merging state across projects.

## Health and configuration

Human-readable health check:

```bash
toolnet-memory doctor
```

Machine-readable health check:

```bash
toolnet-memory doctor --json
```

Read or update global configuration:

```bash
toolnet-memory config get KEY
toolnet-memory config set KEY VALUE
toolnet-memory config open
```

Secret values are masked in normal CLI output.

## Updating

```bash
toolnet-memory update
```

The updater checks the latest npm release and updates the global installation.

## Security model

ToolNet Memory processes source-code metadata, coding-agent activity, and project memory, so project isolation and secret handling are core requirements.

- Never commit `.env` files or credentials.
- Sanitize secrets before durable persistence.
- Never silently inject memory from another project.
- Avoid placing full authentication tokens in logs or diagnostics.
- Treat raw agent transcripts as potentially sensitive.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Development

```bash
git clone https://github.com/LBT-AI/toolnet-memory.git
cd toolnet-memory
npm ci
npm test
npm run build:release
npm pack --dry-run
```

Installer validation:

```bash
bash -n scripts/install.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for repository rules and pull-request requirements.

## Releases

CI validates pushes and pull requests. Version tags trigger the release workflow, which validates the package, publishes through npm Trusted Publishing (OIDC), creates the GitHub Release, and attaches the npm tarball.

The release tag must match `package.json` exactly:

```text
package.json: 0.2.10
Git tag:      v0.2.10
```

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT © 2026 LBT-AI. See [LICENSE](LICENSE).
