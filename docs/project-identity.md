# ToolNet Project Identity

## Goal

The same Git project should retain one ToolNet project identity across:

- different checkout paths,
- different VPS hosts,
- SSH versus HTTPS Git remote syntax.

Absolute filesystem path is not the primary identity for new Git projects.

## Canonical Git identity

Examples:

- `https://github.com/LBT-AI/toolnet-memory.git`
- `git@github.com:LBT-AI/toolnet-memory.git`
- `ssh://git@github.com/LBT-AI/toolnet-memory.git`

normalize to the same canonical repository identity.

Credentials embedded in a Git URL are excluded from the identity fingerprint.

## Resolution

Existing local project:

```text
.toolnet/project.json
        ↓
canonical local project identity
```

Fresh clone:

```text
normalized Git remote
        ↓
Git fingerprint
        ↓
remote ToolNet identity registry
        ↓
existing project ID if registered
```

New repository without an existing registry record:

```text
normalized Git remote
        ↓
deterministic project ID
```

## Legacy project migration

A ToolNet project created before the Git registry may already have a project ID
derived under the previous scheme.

ToolNet preserves that ID.

The old project registers:

```text
Git fingerprint → existing legacy project ID
```

Future clones can then recover the same ID.

If ToolNet sees a legacy remote namespace but cannot prove repository ownership,
it fails closed.

Explicit adoption:

```text
toolnet-memory init --adopt-remote <remote-name>
```

## Safety

ToolNet does not:

- overwrite a different existing local project identity,
- silently adopt an ambiguous legacy remote project,
- include Git HTTPS credentials in identity metadata,
- require remote lookup for intentional local-only initialization.

Local-only escape hatch:

```text
toolnet-memory init --no-remote-identity
```
