# ToolNet Memory Runtime Truth

This document describes the implemented ToolNet Memory runtime.
It intentionally distinguishes implemented behavior from compatibility names,
legacy scaffolds, and planned features.

---

## Runtime model

ToolNet Memory is local-first and deterministic.

The core memory runtime does not require:

- an LLM,
- an embedding provider,
- a vector database,
- a remote model API,
- a mandatory encryption key.

Memory promotion, retrieval, conflict decisions, work continuity, and
multi-host convergence are deterministic code paths.

---

## Memory promotion

Automatic durable-memory promotion is evidence-based and deterministic.

Promotion considers information such as:

- memory kind,
- importance,
- confidence,
- explicit user evidence,
- source/test verification,
- cross-session confirmation.

The promotion policy does not call an LLM.

Explicit memory writes through ToolNet tools remain supported separately from
automatic session learning.

---

## Conflict handling

The current conflict engine uses deterministic authority and evidence.

High-authority evidence includes:

- explicit user statements,
- verified source evidence,
- verified tests,
- repeated cross-session confirmation.

Assistant-derived memory has lower authority than explicit user evidence.

Conflict handling does not use an LLM merge.

Conflict Engine V2 extends deterministic lifecycle handling across:

- rules,
- decisions,
- todos,
- next actions,
- fixes,
- context/state,
- architecture-derived memory.
  Verified fixes can complete related tasks or resolve related state. Lower-authority
  contradictions are retained as conflict evidence but are not surfaced as normal
  active memory.

---

## Local Code Search

Canonical name:

```text
Local Code Search — SQLite FTS5/BM25
```

Implementation:

```text
SQLite: node:sqlite
Index:  FTS5
Rank:   BM25
Mode:   lexical
```

Not used:

```text
LLM            no
embedding      no
vector DB      no
model reranker no
network        no
```

Historical compatibility names remain available:

- `SemanticCodeEngine`
- `semantic_code_search`
- `toolnet-memory semantic`
- `semantic-index`

Those names do not imply embedding-based semantic retrieval.

The compatibility `vectorScore` field remains present for old clients and is
always zero.

---

## Code parser support

| Language / extension | Status                                           | Engine                  |
| -------------------- | ------------------------------------------------ | ----------------------- |
| TypeScript `.ts`     | supported                                        | TypeScript Compiler API |
| TSX `.tsx`           | supported                                        | TypeScript Compiler API |
| JavaScript `.js`     | supported                                        | TypeScript Compiler API |
| JSX `.jsx`           | supported                                        | TypeScript Compiler API |
| MTS `.mts`           | supported                                        | TypeScript Compiler API |
| CTS `.cts`           | supported                                        | TypeScript Compiler API |
| MJS `.mjs`           | supported                                        | TypeScript Compiler API |
| CJS `.cjs`           | supported                                        | TypeScript Compiler API |
| Python `.py`         | lexical FTS5/BM25; structural parser unsupported | none                    |
| Go `.go`             | lexical FTS5/BM25; structural parser unsupported | none                    |
| Rust `.rs`           | lexical FTS5/BM25; structural parser unsupported | none                    |
| C / C++              | unsupported                                      | none                    |

Unsupported languages are not silently represented as fully parsed structural
code intelligence.

Tree-sitter runtime support is not implemented in this release.

---

## TypeScript project resolution

Implemented TypeScript/JavaScript resolution includes:

- relative imports,
- `baseUrl`,
- `paths`,
- TypeScript project references,
- workspace packages,
- common package entrypoints,
- alias resolution for the graph.

---

## Project identity

`.toolnet/project.json` remains the canonical identity when it already exists.

For new Git projects, ToolNet uses normalized Git repository identity rather
than absolute checkout path.

Examples that normalize to the same repository identity:

- `https://github.com/LBT-AI/toolnet-memory.git`
- `git@github.com:LBT-AI/toolnet-memory.git`
- `ssh://git@github.com/LBT-AI/toolnet-memory.git`

Conceptual resolution order:

```text
existing .toolnet/project.json
        ↓
normalized Git remote identity
        ↓
ToolNet remote identity registry
        ↓
verified project adoption
        ↓
new deterministic Git project identity
```

For projects created before the Git identity registry existed, ToolNet does not
silently claim an unverified remote project.

Explicit legacy adoption is available:

```text
toolnet-memory init --adopt-remote <remote-name>
```

A configured remote identity lookup failure for a fresh project fails closed
rather than creating a second identity unknowingly.

Intentional local-only initialization can explicitly skip remote identity
lookup:

```text
toolnet-memory init --no-remote-identity
```

Changing the Git identity of an existing ToolNet project is also explicit.

---

## Multi-host convergence

The old empty `src/sync/**` scaffold is not the active synchronization engine.

Current cross-host continuity lives under:

```text
src/multi-host/**
```

The design uses immutable append-only operations and deterministic ordering /
reduction.

It is not presented as:

- a WebSocket real-time protocol,
- a vector-clock CRDT implementation,
- a distributed filesystem lock.

The append-only operation history is the durable convergence source.

Real-time delivery may be added later without replacing this deterministic
source of truth.

---

## Hook deduplication

Hook event deduplication is project-scoped.

The runtime uses:

- atomic exclusive claim files,
- ownership tokens,
- TTL recovery,
- project-aware event fingerprints.

PID is not part of durable event identity.

Two processes or containers sharing the same project runtime volume can
coordinate through the same marker directory.

No remote S3/R2/Hugging Face distributed lock is claimed.

---

## Retention / garbage collection

`toolnet-memory gc` is dry-run by default.

```text
toolnet-memory gc
```

Actual deletion requires:

```text
toolnet-memory gc --apply
```

Protected durable state is not generic GC material, including important
semantic memory, shared journal data, remote operation history, and unflushed
runtime evidence.

Automatic scheduled GC is not implemented yet.

---

## Storage support

Implemented:

| Storage                            | Status                                   |
| ---------------------------------- | ---------------------------------------- |
| Local                              | supported                                |
| Hugging Face S3-compatible storage | supported                                |
| Generic S3-compatible storage      | supported                                |
| Cloudflare R2                      | supported through S3-compatible provider |

Not implemented:

| Storage                | Status      |
| ---------------------- | ----------- |
| Google Drive           | unsupported |
| GitHub storage backend | unsupported |

Frozen zero-byte placeholders under `src/storage/**` do not represent working
backends.

---

## Encryption and secrets

Implemented:

- Secret Scanner v2,
- provider-key detection,
- limited entropy-based secret detection,
- explicit allow values,
- hash false-positive protection,
- nested durable-data sanitization,
- project-document trust boundaries.

Optional remote client-side encryption is implemented with AES-256-GCM.

Default behavior remains:

| Capability                    | Default   |
| ----------------------------- | --------- |
| remote client-side encryption | off       |
| mandatory encryption key      | no        |
| local storage encryption      | unchanged |

When explicitly enabled, ToolNet encrypts new remote object writes before
they reach supported S3 / R2 / Hugging Face storage providers. Existing
plaintext remote objects remain readable for compatibility. No automatic
bucket-wide migration occurs.

Plaintext remains the default and no encryption key is required unless the
operator explicitly turns remote encryption on.

---

## Project documents and trust

Repository documents such as project instructions are project data.

They are not promoted to system/developer authority merely because their text
contains commands such as:

- `ignore previous instructions`
- `reveal secrets`
- `run this shell command`

ToolNet marks project context as untrusted project data and keeps an explicit
authority boundary around it.

This is a prompt/context trust boundary, not an HTML sanitizer or an operating
system sandbox.

---

## Graph UI exposure

Default graph address:

```text
127.0.0.1:9749
```

The default is loopback-only.

Binding the graph server to `0.0.0.0` is an explicit operator action.

Remote exposure authentication hardening is planned separately.

---

## Memory Agent

`memory_agent_ask` is local-only.

Valid mode:

```text
local
```

The tool does not call an external AI provider.

Returned responses report:

```text
usedAi: false
```

---

## Repository truth

ToolNet avoids treating empty scaffolds as implemented capabilities.

Repository truth rules:

1. Real runtime code is documented as supported.
2. Dead legacy scaffolds are removed when safe.
3. Frozen compatibility boundaries are explicitly documented.
4. Planned functionality is called unsupported until implemented.
5. Compatibility names are preserved when removing them would break clients.

Non-TypeScript lexical search

Python, Go, Rust, C, and C++ are eligible for Local Code Search through
file-level sanitized chunks and SQLite FTS5/BM25.

Their structural parser status remains unsupported.

LSP capability detection is informational only in v0.3.17.
