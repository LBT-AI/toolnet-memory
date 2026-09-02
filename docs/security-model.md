# ToolNet Memory Security Model

## Default network model

ToolNet Memory is local-first.

The graph UI defaults to:

```text
127.0.0.1:9749
```

Remote graph exposure requires an explicit non-loopback bind.

## Durable secret handling

Before selected durable project data is persisted, ToolNet applies secret
scanning and sanitization.

Secret Scanner v2 includes deterministic recognition for common credential
formats plus a limited high-entropy heuristic.

The entropy heuristic is not a universal secret detector and does not replace a
dedicated secret-management system.

## Remote storage encryption

ToolNet Memory does not currently provide mandatory client-side encryption.

There is no default ToolNet master-key requirement.

When remote storage is enabled, ToolNet sends its serialized/sanitized durable
payload to the configured storage provider.

TLS transport and provider-side encryption-at-rest depend on the provider and
operator configuration.

Therefore ToolNet documentation must not claim that remote durable memory is
client-side encrypted by ToolNet.

## Project instruction trust

Repository instruction documents are treated as project data.

They do not become system or developer authority.

ToolNet wraps project context with an explicit untrusted-data boundary before
surfacing it to agent context.

This protects authority semantics but is not an operating-system sandbox.

## Raw session separation

Raw agent/session runtime data is separated from normal durable memory.

Agents should use ToolNet continuity interfaces instead of directly replaying
raw runtime/session transcripts.

## Planned hardening

Future optional features may include:

- explicit remote graph authentication,
- opt-in client-side encryption,
- append-only audit logs.

These features must remain documented as planned until implemented.
