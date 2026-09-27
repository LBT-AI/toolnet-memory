# Local Coordination Daemon

Phase 77 adds one shared, local runtime for every ToolNet client on a machine:
MCP sessions, the CLI and agent integrations all use the same daemon instead of
each process repeating an index, a hydration and a graph build.

The daemon is **runtime coordination only**. It is never an authority.

## Authority boundary

The daemon may hold, and may discard, only rebuildable coordination state:
sessions, project runtimes, watchers, single-flight jobs and the shared query
runtime.

It is never an authority for:

- Memory
- Tasks and the Task WAL
- Sessions (the persistent session records)
- ADRs (`projects/<projectId>/knowledge/adr/...`)
- the Wiki or the Project Manual

Those stay in their existing persistent project stores. Killing the daemon is
always recoverable from source code, persistent authority and derived artifacts.
No authoritative information exists only in daemon memory.

## Relationship to Phase 76 artifacts

    Persistent authority (Memory, Tasks, ADRs)
              │
              ▼
    Derived project artifact      machine-to-machine handoff (Phase 76)
              │
              ▼
    Local coordination daemon     process/session sharing (Phase 77)

The daemon coordinates hydration of Phase 76 artifacts but never changes their
semantics. A valid artifact is downloaded and hydrated once for all waiting
sessions; the parser is not invoked.

## Transport and runtime directory

Local IPC only: a Unix domain socket (or a Windows named pipe). There is **no
TCP listener, no HTTP surface and no remote protocol**.

```text
~/.toolnet-memory/runtime/
  daemon.lock      instance lock (owner identity + pid)
  daemon.sock      Unix socket
  daemon-state.json  bounded status snapshot
```

The runtime directory is owned by the account and created `0700`; group/world
writable directories are refused with `DAEMON_RUNTIME_DIR_INSECURE`. The socket
is created `0600`. The only override is `TOOLNET_DAEMON_ROOT` from the process
environment — repository source cannot point the daemon at an arbitrary socket.

## Start, restart and the admission barrier

Clients connect first and spawn the daemon only when there is definitively no
compatible daemon. Instance election is race-safe: one process wins the instance
lock, every other caller connects to it.

The lock is not a `pid` file check. Startup validates that the recorded process is
alive **and** that it hands back the recorded instance identity over the socket.
A live pid that fails the handshake is a reused pid: the lock is stale and is
retaken. The unrelated process is never signalled or killed. A same-process
startup race is detected through an in-process instance registry, so a loser
cannot steal the winner's lock before it starts listening.

Every handshake carries a deterministic **build fingerprint**: protocol version,
package version, an explicit build marker and the parser/resolver/graph-semantics
/query-schema/artifact-schema fingerprints, plus the runtime root. Package
version alone is deliberately insufficient, because the source tree can carry
uncommitted phase work while the package version is unchanged.

- Fingerprint mismatch → `DAEMON_BUILD_MISMATCH`, no request executed.
- Protocol mismatch → `DAEMON_PROTOCOL_MISMATCH`.

A mismatched daemon is **never** killed or restarted automatically. A normal
shutdown request is rejected with `DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS` while
other sessions are active; forcing it is a trusted local CLI action.

## Sessions

Every connection registers a session (client type + pid, never a human-readable
name used as identity). Clients heartbeat; expired sessions are reaped. A crashed
client is cleaned up on socket close.

Disconnecting a session cancels only work exclusively owned by it:

- a project watcher stops only when its last session detaches;
- a shared job is cancelled only when its last subscriber leaves **and** the job
  is safe to cancel;
- the graph and the daemon keep running for every other session.

Shared work is keyed by project identity + source epoch + runtime generation, so
a new source generation never blindly attaches to a job for the previous one.

## Project runtime state machine

```text
idle → hydrating | indexing
hydrating → ready | indexing | failed
indexing → ready | failed | stale
ready → stale | indexing | hydrating
stale → indexing | hydrating | ready
failed → indexing | hydrating
```

Arbitrary state assignment is rejected. A source change moves a project to
`stale`; the last valid graph stays queryable while a newer generation is
indexed, and freshness is reported honestly rather than as a clean graph.

## Single-flight work

- **Indexing**: ten sessions asking for the same project generation produce one
  index pass; the rest subscribe and receive the same result.
- **Hydration**: one download and one hydration, and zero parser invocations.
- **Fleet**: bursts of project updates are coalesced into one relink.

Progress is real pipeline progress fanned out to subscribers. Under backpressure
progress events may be dropped; responses and final job states are never dropped.

## Query runtime

The Phase 74 query engine can be held in daemon memory so clients do not each
copy the graph. The daemon query path keeps every Phase 74 guarantee: read-only,
bounded, project-isolated, Fleet-isolated, coverage-aware, generation-stamped and
cursor-safe. A cursor from a previous generation still fails with
`CURSOR_STALE`. There is no privileged internal query bypass.

## Evidence runtime (Phase 78)

The daemon also serves evidence profiles. An `evidence` request carries an
explicit Phase 78 request (profile, operation, claim, bounded scope) and returns
the structured bundle. Identical audits are single-flighted and cached in memory,
keyed by project, generation and plan fingerprint, so ten agents asking the same
audit question share one computation. A different generation, profile or scope
never reuses another result, and the cache is bounded. Evidence is derived state:
it never touches Memory, Tasks, Sessions, the Task WAL or ADR authority.

## Cache eviction

Resident graphs are bounded. Idle projects are evicted once they exceed the
resident budget and the idle timeout; eviction releases in-memory derived state
only and never deletes persistent artifacts or authority. Pinned runtimes (active
sessions, active job, active watcher) are never evicted.

## Compatibility, fallback and offline behaviour

- `CodeIntelligenceRuntime` is the abstraction tools depend on.
  `DaemonCodeIntelligenceRuntime` is the shared path; `LocalCodeIntelligenceRuntime`
  is the in-process fallback with identical semantics.
- If the daemon cannot start or connect for a definitive reason, ToolNet falls
  back to an in-process runtime and records a diagnostic. A build/protocol
  mismatch is reported, never papered over.
- A local artifact can always be hydrated offline; the daemon never makes network
  access mandatory.
- Daemon and standalone paths must produce the same generation, coverage and
  query results.

## CLI and MCP surface

```bash
toolnet-memory daemon status
toolnet-memory daemon start
toolnet-memory daemon stop [--force]
toolnet-memory daemon restart
```

MCP exposes a single read-only `daemon_status` tool for diagnostics. It cannot
start, stop or restart the daemon: shutting down another agent's runtime is a
trusted local CLI action, not something an agent may do on its own.

## Logging

Daemon logs are bounded in count and contain structured events only. Source
contents, credentials, tokens and full query text are never logged; free text is
redacted before it is recorded.

## Non-goals

No public port, no remote daemon protocol, no authority lock server, no moving
Memory/Task/ADR stores into the daemon, no source code execution and no per-agent
duplicated indexing.
