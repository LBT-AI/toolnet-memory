<div align="center">

# TOOLNET MEMORY

### Persistent project memory & code intelligence for AI coding agents

**Continue the same project across OpenCode, Agy and Codex without losing context.**

[![npm](https://img.shields.io/npm/v/toolnet-memory?style=flat-square)](https://www.npmjs.com/package/toolnet-memory)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## What does ToolNet Memory do?

ToolNet Memory is a persistent memory layer for AI coding agents.

Its job is simple: **help the next AI understand the project before it continues the work.**

A coding agent normally loses important context when a session ends, tokens run out, you change tools, move to another VPS, or return to the project days later. The new agent may be able to read the source code, but it often does not know the original goal, why an architecture was chosen, what has already been completed, what is still in progress, or which project rules must not be violated.

ToolNet Memory preserves that project knowledge separately from any single AI agent.

```text
OpenCode stops at Phase 3
          ↓
     ToolNet Memory
          ↓
Agy opens the same project
          ↓
Understands the mission, rationale,
completed work, current objective,
constraints and next actions
          ↓
Continues Phase 4
          ↓
Agy later stops at Phase 6
          ↓
     ToolNet Memory
          ↓
Codex continues Phase 7
```

It is **not just chat history**. ToolNet extracts and preserves durable working context such as:

- what the project is building,
- the current objective,
- why the work matters,
- why a specific implementation direction was chosen,
- completed and active phases/tasks,
- deliverables and Definition of Done,
- architecture decisions,
- dependencies and blockers,
- project operating rules,
- important warnings,
- next actions.

The result is a shared technical memory layer between your project and your AI coding agents:

```text
OpenCode / Agy / Codex
          ↓
    ToolNet Memory
          ↓
Project Memory + Work State
+ Semantic Context + Code Intelligence
          ↓
The next agent continues with context
instead of restarting from zero
```

---

## Install

### Recommended

```bash
npx toolnet-memory-install
```

### One-line installer

```bash
curl -fsSL https://memory.toolnet.tech/install | bash
```

### npm

```bash
npm install -g toolnet-memory
```

Requires **Node.js 22+**.

Verify:

```bash
toolnet-memory doctor
```

---


## First-time configuration

After installation, ToolNet Memory can configure storage interactively:

```bash
toolnet-memory setup
If Hugging Face storage is already configured, ToolNet detects it and keeps the existing configuration.
For a new machine, the setup wizard asks for:
HF_NAMESPACE
HF_BUCKET
HF_S3_ACCESS_KEY_ID
HF_S3_SECRET_ACCESS_KEY
Configuration is stored at:
~/.config/toolnet-memory/.env
Permissions are restricted automatically:
~/.config/toolnet-memory      700
~/.config/toolnet-memory/.env 600
Your Hugging Face credentials belong to your own account and are never bundled with ToolNet Memory.
The installer can launch this setup automatically on first install.
 
⸻
 
## Core capabilities

### Persistent Project Memory

Each project gets its own isolated memory universe.

```text
Project A
├── memories
├── vectors
├── code graph
├── semantic context
├── work state
└── snapshots

Project B
├── memories
├── vectors
├── code graph
├── semantic context
├── work state
└── snapshots
```

Project data does not mix across projects.

### Work Continuity

ToolNet tracks structured execution state such as:

```text
Mission
Objective
Why
Plan
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

### Semantic Work Context

ToolNet can preserve:

- project mission,
- current objective,
- why the work matters,
- why a specific approach was chosen,
- phase objective,
- deliverables,
- acceptance criteria,
- dependencies,
- constraints,
- open questions.

If a reason was never explicitly recorded, ToolNet should not invent one.

### Smart Handoff

When a session ends before the work is complete, ToolNet can preserve a compact handoff containing:

```text
What we are building
Why we are building it
What was completed
What is currently active
What remains
What is blocked
Important decisions
Important warnings
Next actions
```

### Project Operating Rules

Each project can retain persistent working rules.

Example:

```text
ONLY edit:
/root/project/source

NEVER edit:
/var/www/project

Deploy only with:
./deploy.sh --apply
```

This avoids repeating the same instructions every session or every time you switch agents.

---

## Code Intelligence

ToolNet builds a project model through:

```text
Source Index
    ↓
Type Resolution
    ↓
Rich Code Graph
    ↓
Semantic Code Index
    ↓
Architecture Intelligence
    ↓
Dependency Analysis
    ↓
Impact Analysis
```

Capabilities include:

- symbol indexing,
- type resolution,
- callers / callees,
- imports,
- inheritance,
- implementations,
- route detection,
- architecture layers,
- subsystem clustering,
- hotspots,
- dependency analysis,
- dead-code candidates,
- blast radius,
- semantic code search.

---

## Quick Start

Inside a project:

```bash
cd /path/to/project
toolnet-memory index
```

ToolNet creates a stable project identity:

```text
.toolnet/project.json
```

Moving or renaming the folder does not create a new project identity.

Check project state:

```bash
toolnet-memory work:status
```

Generate a startup brief:

```bash
toolnet-memory brief
```

Search semantically:

```bash
toolnet-memory semantic "authentication flow"
```

Analyze impact:

```bash
toolnet-memory impact src/path/to/file.ts
```

---

## Main commands

```bash
toolnet-memory doctor

toolnet-memory index
toolnet-memory index:graph
toolnet-memory incremental

toolnet-memory semantic "query"
toolnet-memory impact path/to/file

toolnet-memory brief
toolnet-memory brief:json

toolnet-memory work:status
toolnet-memory work:json
toolnet-memory work:reconcile

toolnet-memory context:sync
toolnet-memory context:print
toolnet-memory context:refresh

toolnet-memory snapshot:list
toolnet-memory snapshot:create "reason"
toolnet-memory snapshot:restore <id>

toolnet-memory recover
toolnet-memory mcp
```

Agent/session integrations include commands for OpenCode, Agy and Codex.

---

## Startup Brief

Before an agent continues work, ToolNet can build a compact project brief containing only relevant context:

```text
PROJECT RULES
MISSION
CURRENT OBJECTIVE
WHY THIS WORK MATTERS
WHY THIS APPROACH
ACTIVE WORK
CURRENT PHASE
PHASE OBJECTIVE
DELIVERABLE
DEFINITION OF DONE
BLOCKERS
RECENT DECISIONS
NEXT ACTIONS
```

The goal is to avoid dumping entire transcripts into the model.

---

## Session Capture

ToolNet can normalize coding-agent sessions into a common project-scoped format.

Sessions can preserve:

```text
session identity
messages
tool activity
file changes
continuity observations
semantic observations
handoff state
```

Raw session history and durable long-term memory remain separate.

---

## Storage model

Remote project data is isolated by project namespace:

```text
projects/<project>/
├── project.json
├── memory/
│   ├── records/
│   └── vectors/
├── code/
│   ├── chunks/
│   ├── vectors/
│   ├── graph/
│   ├── architecture/
│   ├── analysis/
│   └── visualization/
├── work/
├── context/
└── snapshots/
```

---

## MCP

ToolNet exposes memory and code intelligence through MCP.

```bash
toolnet-memory mcp
```

Typical capabilities include memory search, symbol search, dependency lookup, call tracing, architecture context, semantic code search and impact analysis.

---

## 3D Code Graph

ToolNet includes a multi-project code graph dashboard.

```text
https://memory.toolnet.tech
```

It can visualize symbols, files, calls, imports, type usage, architecture clusters, dependencies, dead-code candidates and impact relationships.

---

## Configuration

Global configuration lives at:

```text
~/.config/toolnet-memory/.env
```

Create it with:

```bash
mkdir -p ~/.config/toolnet-memory
chmod 700 ~/.config/toolnet-memory
```

Never commit API keys, tokens or credentials to a repository.

---

## Update

```bash
npm install -g toolnet-memory@latest
```

or rerun:

```bash
npx toolnet-memory-install
```

## Uninstall

```bash
npm uninstall -g toolnet-memory
```

Local `.toolnet` project metadata is not automatically removed.

---

## Development

```bash
git clone https://github.com/LBT-AI/toolnet-memory.git
cd toolnet-memory
npm install
npm run build
npm test
```

Production build:

```bash
npm run build:prod
```

---

## Design principles

**Project isolation** — one project must never silently inherit another project's memory.

**Compact context** — agents receive relevant state, not giant transcript dumps.

**Provenance** — important semantic state should retain where it came from.

**No invented intent** — missing rationale stays unknown instead of becoming fabricated history.

**Agent independence** — the memory layer is not tied to one coding CLI.

**Graceful failure** — memory/context failures should not break the coding agent itself.

---

<div align="center">

### One project. Multiple agents. Continuous memory.

**ToolNet Memory**

</div>
