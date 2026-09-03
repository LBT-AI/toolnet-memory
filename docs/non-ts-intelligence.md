# Non-TypeScript Code Intelligence

ToolNet Memory separates code intelligence into two capability levels.

## Structural intelligence

Full structural parsing remains implemented for the TypeScript / JavaScript
family through the TypeScript Compiler API. That includes:

- file symbols,
- classes,
- interfaces,
- functions,
- methods,
- imports,
- calls,
- inheritance,
- implementation relationships,
- TypeScript path/baseUrl/project-reference resolution.

## Lexical local code search

The following language families are included in deterministic local code
search:

- Python
- Go
- Rust
- C
- C++

They are scanned using the same bounded repository scanner and represented
by a single file node. The smart chunker then splits the file into bounded
sanitized chunks and the chunks are indexed by:

```text
SQLite FTS5 / BM25
```

No embeddings, vector database, model, or network service is involved.

## Structural limitation

For Python, Go, Rust, C, and C++, ToolNet does not invent structural
symbols. In this release these languages do not automatically receive:

- function/class graph nodes,
- call edges,
- import edges,
- inheritance edges,
- compiler/type resolution.

Their local text is searchable, but structural graph capability remains
explicitly unsupported.

## LSP bridge foundation

ToolNet exposes:

```bash
toolnet-memory code:capabilities
toolnet-memory code:capabilities --json
```

The command detects optional external language servers:

| Language | Server             |
| -------- | ------------------ |
| Python   | pyright-langserver |
| Go       | gopls              |
| Rust     | rust-analyzer      |
| C / C++  | clangd             |

Phase 30 performs capability detection only. It does not:

- download language servers,
- send source code to a remote service,
- start an LSP automatically during indexing,
- claim LSP-derived graph edges.

This creates a stable capability boundary for a future opt-in LSP transport
without making v0.3.17 depend on external language-server installations.
