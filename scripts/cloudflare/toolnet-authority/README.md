# ToolNet Memory v0.7 authority Worker

Cloud-side authority for the v0.7 cross-agent continuity design:

- `ProjectAuthority` Durable Object: transactional project state, monotonic
  revisions, task leases with fencing tokens, idempotent commits.
- `AUTHORITY_EVENTS` R2 bucket: append-only copy of every acknowledged commit
  (`events/<projectId>/<revision>.json`).
- `PROJECT_SEEDS` KV: initial project identity, tasks, rules and flows under
  `seed:<projectId>`.
- `TOOLNET_AUTHORITY_TOKEN`: bearer token required on every request.

The transaction rules are imported from `src/v0.7/authority-state.ts`, so the
Worker and the repository tests cannot drift.

## Status

**Not deployed by this repository or its CI.** The checked-in Worker is the
contract implementation; deployment needs the operator's Cloudflare account,
R2 bucket, KV namespace and token secret. Nothing in the repository writes
memory data to the VPS.

## Deploy (operator steps)

```bash
cd scripts/cloudflare/toolnet-authority
npm install -g wrangler
wrangler login
wrangler r2 bucket create toolnet-authority-events
wrangler kv namespace create PROJECT_SEEDS   # copy id into wrangler.toml
wrangler secret put TOOLNET_AUTHORITY_TOKEN
wrangler deploy
```

Then seed a project:

```bash
wrangler kv key put --binding PROJECT_SEEDS "seed:project-a" \
  '{"projectId":"project-a","projectName":"Project A","tasks":[]}' --remote
```

Point the client at the deployment:

```bash
export TOOLNET_CLOUD_AUTHORITY_URL="https://toolnet-authority.<account>.workers.dev"
export TOOLNET_CLOUD_AUTHORITY_TOKEN="<same secret>"
export TOOLNET_DURABILITY_MODE="strict-cloud-only"
```

## Failure semantics

- Cloud unreachable: the client reports `AUTHORITY_UNAVAILABLE`, keeps events in
  a bounded RAM buffer and never falls back to local disk.
- Stale writer: a commit carrying an old fencing token is rejected with
  `AUTHORITY_LEASE_FENCED`.
- Unacknowledged event: never presented as a resumable checkpoint.
