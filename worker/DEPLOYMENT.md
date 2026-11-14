# ToolNet Memory v0.7.0 — Cloudflare Workers Deployment Guide

## Prerequisites

1. Cloudflare account with Workers and R2 enabled
2. Wrangler CLI installed (`npm install -g wrangler`)
3. Authenticated with Cloudflare (`wrangler login`)

## Configuration

### 1. Create R2 Bucket

```bash
wrangler r2 bucket create toolnet-memory-events
```

### 2. Configure wrangler.toml

Update `worker/wrangler.toml` with your account details:

```toml
name = "toolnet-memory-authority"
account_id = "YOUR_ACCOUNT_ID"

[[r2_buckets]]
binding = "MEMORY_EVENTS"
bucket_name = "toolnet-memory-events"

[vars]
TOOLNET_AUTH_TOKEN = "your-secure-random-token-here"
```

### 3. Set Secrets

```bash
wrangler secret put TOOLNET_AUTH_TOKEN
# Enter a secure random token (e.g., generated with: openssl rand -hex 32)
```

## Deployment

### Dry Run (Validation Only)

```bash
cd worker
npm run deploy:dry-run
```

### Production Deploy

```bash
cd worker
npm run deploy
```

## Client Configuration

Set these environment variables on the VPS/client:

```bash
export TOOLNET_CLOUD_AUTHORITY_URL=https://toolnet-memory-authority.YOUR_SUBDOMAIN.workers.dev
export TOOLNET_CLOUD_AUTHORITY_TOKEN=your-secure-random-token-here
export TOOLNET_DURABILITY_MODE=strict-cloud-only
```

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│   AGY/Codex     │ ─────────────► │  Cloudflare Workers  │
│   (Client)      │                │  (Authority DO)      │
└─────────────────┘                └──────────┬───────────┘
                                              │
                                              ▼
                                    ┌──────────────────────┐
                                    │      R2 Bucket       │
                                    │  (Immutable Events)  │
                                    └──────────────────────┘
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/projects/:projectId/state` | Fetch project snapshot |
| POST | `/v1/projects/:projectId/commit` | Commit operations |
| POST | `/v1/projects/:projectId/leases/acquire` | Acquire task lease |
| POST | `/v1/projects/:projectId/leases/heartbeat` | Lease heartbeat |
| POST | `/v1/projects/:projectId/leases/release` | Release lease |

## Authentication

All API endpoints require `Authorization: Bearer <TOKEN>` header matching `TOOLNET_AUTH_TOKEN`.

## Live Deploy Status

**LIVE DEPLOY BLOCKED**: Cloudflare credentials not configured in this repository. To deploy:
1. Create Cloudflare account
2. Enable Workers and R2
3. Configure `wrangler.toml` with your account ID
4. Run `wrangler login`
5. Create R2 bucket
5. Set `TOOLNET_AUTH_TOKEN` secret
6. Run `npm run deploy` from worker directory

## Verification

After deployment, verify:

```bash
# Health check
curl https://toolnet-memory-authority.YOUR_SUBDOMAIN.workers.dev/health

# Fetch state (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://toolnet-memory-authority.YOUR_SUBDOMAIN.workers.dev/v1/projects/test-project/state
```

## Monitoring

Enable Workers observability in `wrangler.toml`:
```toml
[observability]
enabled = true
```

View logs: `wrangler tail toolnet-memory-authority`