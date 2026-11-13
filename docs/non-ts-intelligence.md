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

## Structural intelligence for Python, Go, Rust, C, C++

Python, Go, Rust, C, and C++ are parsed structurally with package-owned
tree-sitter grammars. Grammar assets ship with the package and resolve
offline — no grammar is downloaded at index time. Structural parsing derives:

- function/method/class graph nodes,
- call edges,
- import edges,
- inheritance edges.

When a grammar asset is unavailable, parsing fails closed to lexical
indexing for that file and graph coverage records the structural gap —
a fallback is never reported as a structural success.

Grammar assets resolve from the installed `node_modules` beside the
package. Standalone single-binary builds are outside the verified parser
matrix: if an asset does not resolve there, the same fail-closed lexical
fallback applies.

What structural parsing does not imply:

- compiler/type resolution,
- LSP-derived graph edges (LSP stays detection-only, see below).

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
