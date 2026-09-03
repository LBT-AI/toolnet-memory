# ToolNet Memory Security Model

## Default network model

ToolNet Memory is local-first.

The graph UI defaults to:

```text
127.0.0.1:9749
```

The default remains loopback-only.

Graph API hardening includes:

- loopback Host-header validation to reduce DNS-rebinding exposure,
- same-origin checks for browser API requests,
- optional bearer authentication through `TOOLNET_GRAPH_TOKEN`,
- constant-time bearer-token comparison,
- minimal unauthenticated `/api/health`,
- security response headers,
- optional `TOOLNET_GRAPH_ALLOWED_HOSTS` for reverse-proxy / wildcard-host restriction.

`/api/health` does not expose project IDs, project names, paths, project counts,
storage information, or token state.

The static Graph UI shell remains accessible so a browser can load it and
request the bearer token interactively when protected APIs return HTTP 401.

The bearer token is an access-control credential. It is not a memory encryption
key and does not enable client-side encryption.

Binding to a non-loopback host without `TOOLNET_GRAPH_TOKEN` remains possible
for compatibility, but ToolNet emits an explicit security warning.

## Durable secret handling

Before selected durable project data is persisted, ToolNet applies secret
scanning and sanitization.

Secret Scanner v2 includes deterministic recognition for common credential
formats plus a limited high-entropy heuristic.

The entropy heuristic is not a universal secret detector and does not replace a
dedicated secret-management system.

## Remote storage encryption

Remote client-side encryption is optional and disabled by default. When
enabled with `TOOLNET_REMOTE_ENCRYPTION=on`, ToolNet encrypts remote object
writes with AES-256-GCM before passing ciphertext to supported remote
storage providers.

Normal local/plaintext operation requires no encryption key. Existing
plaintext remote objects remain readable after encryption is enabled. New
and rewritten remote objects are encrypted. Encrypted objects require the
matching key when read.

Supported key sources:

- `TOOLNET_REMOTE_ENCRYPTION_KEY`
- `TOOLNET_REMOTE_ENCRYPTION_KEY_FILE`

Provider TLS and provider-side encryption remain complementary protections.

See `docs/remote-encryption.md`.

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
- append-only audit logs.

These features must remain documented as planned until implemented.
