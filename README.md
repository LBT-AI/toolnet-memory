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

ToolNet Memory supports multiple storage backends.
**Cloudflare R2 is the default and recommended provider**, but ToolNet Memory does not require Cloudflare or Hugging Face. You can also use any supported S3-compatible backend or run fully local without any cloud storage.

### Cloudflare R2 — default

````bash
# ~/.config/toolnet-memory/.env
MEMORY_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=toolnet-memory
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key

Generic S3 / S3-compatible

Works with AWS S3 and compatible services such as MinIO, Backblaze B2 S3, Wasabi, and similar providers.

MEMORY_STORAGE_PROVIDER=s3
# Leave empty for AWS S3.
S3_ENDPOINT=
S3_REGION=us-east-1
S3_BUCKET=toolnet-memory
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_FORCE_PATH_STYLE=false

Local storage — no cloud required

ToolNet Memory can run completely locally.

MEMORY_STORAGE_PROVIDER=local
MEMORY_LOCAL_STORAGE_PATH=/path/to/toolnet-memory-storage
MEMORY_LOCAL_CACHE_MB=200

Local mode is useful for:

* offline development,
* private projects that must not use remote storage,
* testing,
* single-machine workflows.

No R2, S3, or Hugging Face account is required.

Hugging Face S3 — legacy compatibility

Existing installations can continue using the Hugging Face S3-compatible backend.

MEMORY_STORAGE_PROVIDER=huggingface
HF_NAMESPACE=your-namespace
HF_BUCKET=toolnet-memory
HF_S3_ACCESS_KEY_ID=your-access-key
HF_S3_SECRET_ACCESS_KEY=your-secret-key

Hugging Face remains supported for compatibility, but new installations should normally prefer R2, generic S3, or local storage.

Embedding provider

The current Hugging Face embedding configuration is independent from the storage provider.

For example, you can use:

Cloudflare R2 storage + Hugging Face embeddings
Local storage + Hugging Face embeddings
Generic S3 storage + Hugging Face embeddings

Embedding configuration:

HF_TOKEN=
HF_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

See docs/STORAGE.md⁠ for detailed provider setup.


## One-time VPS setup

Global configuration is stored at:

```text
~/.config/toolnet-memory/.env
````

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

## Memory retrieval and automation

ToolNet Memory exposes retrieval and automation controls through the global environment configuration.

These settings are optional. The defaults are designed to work without manual tuning.

Automatic memory behavior

MEMORY_AUTO_CAPTURE=true
MEMORY_AUTO_RETRIEVE=true
MEMORY_AUTO_SUMMARIZE=true
MEMORY_AUTO_SYNC=true

- MEMORY_AUTO_CAPTURE — capture meaningful project activity.
- MEMORY_AUTO_RETRIEVE — allow relevant memory retrieval.
- MEMORY_AUTO_SUMMARIZE — generate compact summaries instead of persisting raw conversational noise.
- MEMORY_AUTO_SYNC — sync eligible project state to the configured storage backend.

Retrieval limits

MEMORY_MAX_CANDIDATES=50
MEMORY_RERANK_TOP=10
MEMORY_FINAL_CONTEXT=5
MEMORY_TOKEN_BUDGET=2000

The retrieval pipeline is intentionally bounded:

candidate search
↓
max 50 candidates
↓
rerank top 10
↓
select up to 5 final context items
↓
enforce token budget

Remote storage can contain a large project history, but ToolNet Memory should never dump the entire history into an agent prompt.

Session continuity

TOOLNET_SESSION_LEARNING=1
TOOLNET_WORK_CONTINUITY=1
TOOLNET_SEMANTIC_CONTINUITY=1
TOOLNET_SMART_HANDOFF=1

These flags control automatic session learning, work-state continuity, semantic continuity, and compact handoff generation.

Session history is filtered and selectively promoted. Raw transcript content is not intended to be injected into normal startup context.

Context modes

Normal agent startup uses a small local context budget.

minimal → project rules + current task
focused → minimal + a small number of relevant memories
deep → manual recovery only

Use deep recovery only when older session history is genuinely required.

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

## Multi-provider AI setup

Run:

```bash
toolnet-memory setup

ToolNet Memory separates AI configuration into independent roles:

* LLM — reasoning, summarization, classification, and memory intelligence.
* Embedding — semantic indexing and retrieval.
* LLM Fallbacks — optional secondary providers for transient failures.

Supported LLM providers include:

* OpenAI-compatible
* Alibaba / DashScope
* OpenRouter
* Groq
* DeepSeek
* NVIDIA NIM
* Gemini
* Hugging Face
* Ollama / Local
* Cloudflare Workers AI
* Custom endpoints

Canonical configuration:

TOOLNET_LLM_PROVIDER=
TOOLNET_LLM_API_KEY=
TOOLNET_LLM_BASE_URL=
TOOLNET_LLM_MODEL=
TOOLNET_EMBEDDING_PROVIDER=
TOOLNET_EMBEDDING_API_KEY=
TOOLNET_EMBEDDING_BASE_URL=
TOOLNET_EMBEDDING_MODEL=

Optional resilient LLM chain:

TOOLNET_LLM_FALLBACK_1_PROVIDER=
TOOLNET_LLM_FALLBACK_1_API_KEY=
TOOLNET_LLM_FALLBACK_1_BASE_URL=
TOOLNET_LLM_FALLBACK_1_MODEL=
TOOLNET_LLM_FALLBACK_2_PROVIDER=
TOOLNET_LLM_FALLBACK_2_API_KEY=
TOOLNET_LLM_FALLBACK_2_BASE_URL=
TOOLNET_LLM_FALLBACK_2_MODEL=
TOOLNET_LLM_FALLBACK_COOLDOWN_MS=60000
TOOLNET_LLM_MAX_RETRIES=1

Fallback is used only for transient failures such as:

* timeout / network failure
* HTTP 408
* HTTP 429
* HTTP 5xx

HTTP 400, 401, and 403 are surfaced instead of silently switching providers.

Legacy provider environment variables remain readable for backward compatibility. The setup wizard can migrate recognized legacy values into canonical TOOLNET_* configuration without deleting the original variables.

Diagnostics:

toolnet-memory provider:list
toolnet-memory provider:status
toolnet-memory provider:test
toolnet-memory provider:test llm
toolnet-memory provider:test embedding
toolnet-memory doctor

Provider status masks API keys and secrets.
```
