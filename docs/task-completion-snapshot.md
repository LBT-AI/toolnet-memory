# Task Completion Snapshot

Phase 43 adds a first-class immutable completion result to the existing Persistent Task projection.

## Durable path

```text
visible native result
        ↓
NormalizedSessionEvent
        ↓
Phase 42 native source binding
        ↓
completion snapshot builder
        ↓
task.completion.recorded
        ↓
Task operation log and projection
        ↓
read-only Tasks Panel API and UI
```

The task operation log remains authoritative. There is no separate completion database or JSON store.

## Snapshot contents

A completion snapshot contains a bounded visible summary, changes, visible decisions, verification summaries, copied files, copied test outcomes, an optional trusted commit SHA, source identity, capture time, and a deterministic digest.

The builder sanitizes content before hashing or persistence. Long values and arrays are truncated deterministically. Commit values must use a conservative hexadecimal SHA shape.

Completion IDs are deterministic for the project, task, provider, native session, and source event. The operation timestamp is authoritative for `capturedAt`.

## Lifecycle and immutability

The completion operation is accepted only after the Task lifecycle is already `completed`. Dependency, child, progress, and lease guards remain in `TaskStateEngine`; a native completed plan cannot bypass them.

The completion operation never changes lifecycle state. Replaying the same digest is a logical no-op. A different digest after a completion is rejected with `TASK_COMPLETION_ALREADY_RECORDED`.

## Native correlation

Codex `update_plan` and OpenCode `todowrite` continue to use Phase 42 structured adapters and durable source bindings. Correlation is scoped to provider, native session, plan, and source key; titles and TODO positions are not used as global identity.

Visible result records must be explicit completion/result records. Ordinary assistant prose, reasoning metadata, tool output, terminal transcripts, and unrelated messages are ignored. If a visible result and a completed plan arrive in different batches, the bounded binding projection retains the result until the lifecycle event can be correlated. Ambiguous or stale associations fail closed.

When no visible result exists, the Task remains completed without a snapshot until a deterministic result is available. A fallback can be built from the completed title, copied files, test counts, and commit evidence when that fallback is explicitly requested by a future caller; no LLM is used.

## Tasks Panel

`GET /api/tasks` exposes only the read-only completion projection needed by the browser: summary, changes, decisions, verification, files, tests, commit, capture time, and provider. Raw WAL rows, source payloads, hidden reasoning, and generic evidence history are not exposed.

The existing Tasks Panel preserves its tree and three-second polling while open. Completed rows render the summary and compact bounded detail beneath the title, with all native strings escaped before insertion into HTML.
