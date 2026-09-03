# ToolNet Memory Audit Log

ToolNet Memory keeps a project-scoped append-only audit history at:

```text
.toolnet/audit/events.jsonl
```

The audit log records durable and security-sensitive operations such as:

- durable memory saves,
- snapshot creation,
- snapshot restore,
- snapshot recovery,
- Guard checks,
- manual GC execution,
- scheduled GC execution.

## Data minimization

The audit log does not intentionally persist raw memory content. Guard
command checks do not persist the raw shell command. Audit details pass
through the same durable-data sanitizer used by other ToolNet durable
state.

## Actor identity

When available, `TOOLNET_AGENT_ID` is recorded as the agent identity.
Otherwise the integration source is recorded, such as:

- `mcp`
- `cli`
- `service pid`

## Integrity chain

Each JSONL record contains:

- `sequence`
- `previousHash`
- `hash`

The `hash` is SHA-256 over a canonical representation of the event.
Changing or deleting an earlier record breaks verification for the
subsequent chain.

Verify:

```bash
toolnet-memory audit:verify
```

Read recent events:

```bash
toolnet-memory audit
toolnet-memory audit --limit 100
toolnet-memory audit --json
```

## Concurrency

Audit writes use a local exclusive ownership lock created with `O_EXCL`.
The lock contains a random ownership token. A process only removes the
lock when it can prove ownership. Stale audit locks may be recovered
after a bounded timeout.

This is same-filesystem coordination, not a distributed object-storage
lock.

## Garbage collection

The audit log is durable security data. Normal ToolNet GC explicitly
protects `.toolnet/audit/events.jsonl` from age-based deletion.
