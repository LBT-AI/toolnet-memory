# Integration Matrix — Capability & Certification Semantics

Canonical authority: `src/session/integration-capabilities.ts`, derived via
`src/session/integration-matrix.ts`. Nothing here is hand-counted: the GA
certifier, README check, and release-manifest check all derive the same
matrix. A new registry entry flows into every consumer automatically.

## No alias model

Every supported product identity is its own canonical adapter. Legacy
names, product rebrands, and binary aliases are not represented anywhere
in the registry, so the support count cannot be inflated by aliases:
canonical count = product identities count.

## Certification classes

The class is driven by **capture mode** (how session events actually reach
ToolNet), not by refresh mode alone:

| Class                    | Meaning                                                                                           | Zero-touch normal flow        |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| `AUTO_NATIVE`            | Native lifecycle hooks capture the session delta automatically                                    | yes                           |
| `AUTO_PERSISTENT_PLUGIN` | Persistent plugin boundary captures automatically (OpenCode)                                      | yes                           |
| `AUTO_MANAGED_WRAPPER`   | Managed wrapper captures at session end (Aider)                                                   | yes                           |
| `MANUAL_RECOVERY`        | Native session source exists; an explicit recovery command imports it (ToolNet CLI, Plandex)      | no, recovery command required |
| `MCP_ONLY`               | MCP continuity/read path only; no native capture claimed (Kilo)                                   | n/a (read-only)               |
| `BLOCKED`                | Capture unavailable with an explicit reason (OpenRouter: product identity; Warp: hook capability) | n/a                           |

Manual-only integrations are fully certified for what they do; they must
not fail GA for not being automatic, but they cannot count as AUTO.

## Zero-touch definition

For every AUTO integration, the normal flow is: use the agent normally →
native lifecycle/plugin/wrapper boundary → current session delta →
WAL → `SessionCore.flush()` → learner → journal → MemoryStore →
cross-agent retrieval. Zero manual commands on the normal path.
`SessionCore.flush()` is the sole materialization owner; no integration
writes MemoryStore directly.

## Platform evidence

- Linux: CERTIFIED (this suite executes on Linux)
- macOS: NOT_TESTED (no live evidence in this environment)
- Windows: NOT_TESTED (no live evidence in this environment)

No cross-platform live certification is claimed without evidence.
`SOURCE_SUPPORTED` applies where the adapter is platform-independent
TypeScript with no platform-gated dependency; live behavior is still only
certified where executed.

## Rovo preview

Rovo hooks are preview/experimental (Atlassian hook API may change).
`inspectRovoStatus()` reports `preview: true` with the reason, the CLI
prints it, and the README Rovo section says so. Preview is certified as
functional-with-limitation, never marketed as stable.

## Release provenance (v0.6.2)

`release-manifest.json → releaseEngineering` (`sourcePhase`,
`certificationThrough`, `releaseBaseline`, `targetVersion`) describes the
provenance of the v0.6.2 release itself and stays historical. Current
source certification is reported by the suites and gates, not by rewriting
those fields.
