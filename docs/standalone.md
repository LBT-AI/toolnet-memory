# ToolNet Memory Standalone Executables

ToolNet Memory can be distributed as one executable per operating-system /
architecture target. No Node.js installation is required on the target
machine. No npm installation is required on the target machine. The npm
distribution remains supported.

## Runtime technology

Standalone builds use:

```text
Node.js 22 runtime
Enhanced Single Executable Application mode
@yao-pkg/pkg
esbuild single-module bundle
```

The standalone executable embeds its Node.js runtime and production
JavaScript dependency graph.

ToolNet still does not add an LLM, embedding runtime, or vector database.

## Release targets

```text
toolnet-memory-linux-x64
toolnet-memory-linux-arm64
toolnet-memory-macos-x64
toolnet-memory-macos-arm64
toolnet-memory-windows-x64.exe
```

## Linux

```bash
chmod +x toolnet-memory-linux-x64
mv toolnet-memory-linux-x64 ~/.local/bin/toolnet-memory
toolnet-memory --version
```

## macOS

Choose the binary matching the Mac architecture.

Intel:

```text
toolnet-memory-macos-x64
```

Apple Silicon:

```text
toolnet-memory-macos-arm64
```

The release workflow applies ad-hoc code signing. The binary is not
claimed to be Apple-notarized unless a future release pipeline explicitly
adds Developer ID signing and notarization. The npm distribution remains
supported.

## Windows

Release file:

```text
toolnet-memory-windows-x64.exe
```

The Phase 28 Windows executable is not claimed to have Microsoft code
signing. Windows SmartScreen may therefore display an unknown-publisher
warning until a future signing pipeline is configured.

## Command compatibility

The standalone router mirrors the public `bin/toolnet-memory` command
surface. Examples:

```bash
toolnet-memory init
toolnet-memory status
toolnet-memory doctor
toolnet-memory context
toolnet-memory ask "what changed?"
toolnet-memory index
toolnet-memory semantic "authentication flow"
toolnet-memory graph
toolnet-memory mcp
```

## Graph UI

The normal npm CLI starts `graph-ui.js` as a child process. A one-file
executable has no sibling JavaScript file. The standalone router therefore
starts the same Graph server directly inside the standalone process. The
Graph UI HTML and `3d-force-graph` browser asset are packaged into the
standalone virtual filesystem. Graph security from Phase 25 remains in
effect.

## Service limitations

The current ToolNet daemon transport uses a Unix-domain socket. Therefore:

- Linux/macOS can run `toolnet-memory service` in the foreground.
- `service:status` remains available on Unix.
- PM2-oriented `service:install` / `service:start` / `service:stop` /
  `service:restart` / `service:remove` are not claimed as standalone
  features.
- Windows daemon/service transport is not claimed as supported in Phase 28.

This limitation does not prevent normal memory, indexing, MCP, continuity,
snapshot, guard, or project commands from running as a Windows executable.
Native Windows Service support remains a separate feature.

## Agent integrations

Some integration commands call external tools such as OpenCode, Codex,
Git, shells, or other agent CLIs. The ToolNet executable itself does not
require Node.js, but those external integrations still require their
respective applications and platform dependencies.

## Update command

The npm CLI can update through `npm`. A standalone executable does not
silently install npm or Node. `toolnet-memory update` therefore reports
that standalone updates should use a new binary from the matching GitHub
Release.

## Build locally

Install project dependencies on the build host:

```bash
npm ci
```

Build the host target:

```bash
npm run standalone:build
```

Build an explicit target:

```bash
npm run standalone:build -- --target node22-linux-x64
```

Supported build targets:

```text
node22-linux-x64
node22-linux-arm64
node22-macos-x64
node22-macos-arm64
node22-win-x64
```

## No-Node smoke test

On Linux with Docker:

```bash
npm run standalone:smoke
```

The smoke test runs the generated binary inside a clean Debian container
and first verifies that neither `node` nor `npm` exists there. The
standalone executable must still return its version successfully.

## Release checksums

GitHub Releases include:

```text
SHA256SUMS
```

Verify on Linux:

```bash
sha256sum -c SHA256SUMS
```

## Architecture

Standalone packaging changes distribution only. It does not change:

- memory persistence format,
- project identity,
- conflict resolution,
- multi-host operation logs,
- storage provider behavior,
- optional remote encryption,
- SQLite FTS5/BM25 code search.
