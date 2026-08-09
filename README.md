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

## Quick Start

```bash
# Install globally (once per VPS/user)
curl -fsSL https://memory.toolnet.tech/install | bash

# Initialize project
cd /path/to/project
toolnet-memory init

# View fast startup context
toolnet-memory
```

**Fast Context Output:**

```text
# Profile

Your development preferences and coding style.

---

# Current Work

Mission: Build authentication system
Objective: Implement OAuth2 flow
Phase: Implementation
Task: Add token refresh logic

Next Actions:
- [ ] Implement refresh token endpoint
- [ ] Add token expiry validation
```

The default command (`toolnet-memory` with no arguments) prints fast startup context from local files only (~150ms, no network/storage access). This provides AI agents with immediate project context at session start.

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

## Storage Configuration

ToolNet Memory supports multiple storage backends. **Cloudflare R2 is recommended** for production use due to zero egress fees and S3 compatibility.

### Cloudflare R2 (Recommended)

```bash
# In ~/.config/toolnet-memory/.env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=toolnet-memory
```

### AWS S3 / S3-Compatible

```bash
STORAGE_PROVIDER=s3
S3_REGION=us-east-1
S3_BUCKET=toolnet-memory
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Hugging Face S3 (Legacy)

```bash
STORAGE_PROVIDER=huggingface
HF_TOKEN=hf_your_token
HF_REPO=username/toolnet-memory
```

### Local Storage

```bash
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=/path/to/storage
```

See [docs/STORAGE.md](docs/STORAGE.md) for detailed setup instructions.

## One-time VPS setup

Global configuration is stored at:

```text
~/.config/toolnet-memory/.env
```

Run setup once on a new VPS/user account:

```bash
toolnet-memory setup
```

The setup flow can configure storage backend and detect supported coding agents. Credentials stay outside project repositories and must never be committed.

## Per-project setup

Each source project gets a stable identity and isolated remote namespace.

```bash
cd /path/to/project

# Initialize project and create agent instruction files
toolnet-memory init

# Or manually:
toolnet-memory project:manual-init --project "$PWD"
toolnet-memory profile:sync
toolnet-memory index
```

ToolNet creates project metadata under:

```text
.toolnet/
├── profile.md      # Your development preferences
└── current.md      # Current work state
```

And agent instruction files in the project root:

```text
GEMINI.md           # Instructions for Gemini/Agy
AGENTS.md           # Standard agent instructions
CLAUDE.md           # Instructions for Claude/Codex
```

These files provide fast startup context to AI agents without requiring network access or deep memory recovery.

A stable project identity prevents memory from being mixed merely because folders are renamed or moved.

Remote storage is scoped by project:

```text
projects/<project-remote>/
├── memory/         # Persistent project memory
├── code/           # Code intelligence index
├── sessions/       # Session transcripts (filtered)
├── work/           # Work continuity state
└── snapshots/      # Project snapshots
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

The intended normal workflow does not require users to manually say "save memory" or "load memory". Agent/session hooks capture meaningful activity and restore relevant project context at the next session.

## Fast Context vs Deep Recovery

ToolNet Memory provides two levels of context:

### Fast Context (Default)

Fast context reads only local files (`.toolnet/profile.md`, `.toolnet/current.md`) and completes in ~150ms without network or storage access. This is the default behavior and provides immediate startup context.

```bash
# Fast context (default command)
toolnet-memory
toolnet-memory context:print

# Sync profile and current work to local files
toolnet-memory profile:sync
```

### Deep Recovery (Manual Only)

Deep memory recovery fetches full session history and project memory from remote storage. This is **manual only** and not run automatically at agent startup to avoid noise and latency.

```bash
# Recover last 10 sessions (default limit)
toolnet-memory session:agy-recover

# Get latest handoff brief
toolnet-memory handoff:latest

# Full brief with memory
toolnet-memory brief
```

Session transcripts are filtered to remove:

- System messages and tool logs
- npm install/build noise
- Sensitive data patterns
- Redundant context

## Example Workflow

```bash
# 1. Initialize project
cd /path/to/project
toolnet-memory init

# 2. Start coding with your agent
agy "implement user authentication"

# 3. Fast context is automatically injected at session start
# Agent sees profile.md + current.md (~150ms)

# 4. Work continues across sessions
codex "add password reset flow"

# 5. Query semantic code context
toolnet-memory semantic "auth flow"

# 6. Check change impact
toolnet-memory impact src/auth.ts

# 7. Manual deep recovery if needed
toolnet-memory session:agy-recover --limit 5
```

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
- Storage credentials are stored in `~/.config/toolnet-memory/.env` (never in project repos).

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

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
