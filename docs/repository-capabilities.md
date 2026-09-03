# ToolNet Memory Repository Capability Truth

This file distinguishes implemented runtime capabilities from legacy scaffolds and unsupported placeholders.

## Implemented

| Capability                         | Implementation                   |
| ---------------------------------- | -------------------------------- |
| Local storage                      | `src/storage/local/**`           |
| Hugging Face storage               | `src/storage/huggingface/**`     |
| S3 / compatible storage            | `src/storage/s3/**`              |
| Cloudflare R2                      | S3-compatible provider           |
| Deterministic BM25 retrieval       | `src/retrieval/bm25.ts`          |
| Deterministic local hybrid ranking | `src/retrieval/hybrid-search.ts` |
| Multi-host convergence             | `src/multi-host/**`              |
| MCP memory search                  | `memory-search`                  |
| MCP memory write                   | `memory-remember`                |
| MCP memory delete                  | `memory-forget`                  |

## Explicitly unsupported

The following names must not be interpreted as implemented features:

- Google Drive storage
- GitHub storage
- model/LLM reranking
- embedding retrieval
- vector database retrieval
- semantic query expansion
- dedicated query classifier
- dedicated MCP tools named `memory-rules`, `memory-todos`, `memory-decisions`, `memory-recent`
- MCP `index-repository`

## Optional remote encryption

Supported:

- AES-256-GCM remote client-side encryption

Default:

- disabled

No encryption key is required unless the operator explicitly enables remote
encryption. Existing plaintext remote objects remain readable; new or
rewritten remote objects are encrypted while the feature is enabled.

See `docs/remote-encryption.md`.

Google Drive and GitHub placeholder files currently remain untouched because `src/storage/**` is a frozen compatibility boundary. They are not exported by the active storage provider surface.

## Legacy sync scaffold

The old `src/sync/**` directory contained empty, unimplemented scaffolding.
It is not the current ToolNet multi-host architecture.
The implemented cross-host design lives under:

```text
src/multi-host/**
```

and uses immutable operations plus deterministic convergence.

## Retrieval cleanup

The active retrieval implementation is located in the top-level retrieval modules such as:

- `src/retrieval/bm25.ts`
- `src/retrieval/hybrid-search.ts`
- `src/retrieval/query-analyzer.ts`
- `src/retrieval/retrieval-engine.ts`

Empty nested BM25/hybrid/graph/reranker scaffolds are not alternative retrieval engines and are removed by the repository truth cleanup.

## Security

ToolNet Memory performs secret scanning and durable-data sanitization.

Client-side encryption is not implemented in this release.

No encryption key is required by default.

## Local Code Search naming

The canonical capability name is:

```text
Local Code Search — SQLite FTS5/BM25
```

The following historical names remain compatibility aliases:

- `SemanticCodeEngine`
- `semantic_code_search`
- `toolnet-memory semantic`
- `semantic-index`

They do not mean that ToolNet uses embeddings, a vector database, an LLM, or a model reranker.
