import { timingSafeEqual } from 'node:crypto';

import { Hono, type Context } from 'hono';
import { Authority } from './authority.js';

export { Authority } from './authority.js';

interface Env {
  AUTHORITY: DurableObjectNamespace<Authority>;
  MEMORY_EVENTS: R2Bucket;
  TOOLNET_AUTH_TOKEN: string;
}

const app = new Hono<{ Bindings: Env }>();

function unauthorized(c: Context<{ Bindings: Env }>): Response {
  return c.json(
    { error: { code: 'AUTHORITY_AUTH_FAILED', message: 'Invalid or missing token' } },
    401
  );
}

function tokensMatch(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const providedBytes = Buffer.from(provided, 'utf8');

  if (expectedBytes.length !== providedBytes.length) {
    timingSafeEqual(expectedBytes, expectedBytes);
    return false;
  }

  return timingSafeEqual(expectedBytes, providedBytes);
}

function authorized(request: Request, env: Env): boolean {
  const expected = env.TOOLNET_AUTH_TOKEN;

  if (!expected) {
    return false;
  }

  const header = request.headers.get('authorization');
  const match = header ? /^Bearer\s+(\S+)$/i.exec(header.trim()) : null;

  if (!match) {
    return false;
  }

  return tokensMatch(expected, match[1]);
}

app.get('/health', (c) => c.json({ status: 'ok', service: 'toolnet-memory-authority' }));

app.get('/v1/projects/:projectId/state', async (c) => {
  if (!authorized(c.req.raw, c.env)) {
    return unauthorized(c);
  }

  const projectId = c.req.param('projectId');
  const id = c.env.AUTHORITY.idFromName(projectId);
  const stub = c.env.AUTHORITY.get(id);
  const response = await stub.fetch(`http://internal/state`, { method: 'GET' });

  return response;
});

app.post('/v1/projects/:projectId/commit', async (c) => {
  if (!authorized(c.req.raw, c.env)) {
    return unauthorized(c);
  }

  const projectId = c.req.param('projectId');
  const body = await c.req.json();
  const id = c.env.AUTHORITY.idFromName(projectId);
  const stub = c.env.AUTHORITY.get(id);
  const response = await stub.fetch(`http://internal/commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, projectId }),
  });

  return response;
});

app.post('/v1/projects/:projectId/leases/acquire', async (c) => {
  if (!authorized(c.req.raw, c.env)) {
    return unauthorized(c);
  }

  const projectId = c.req.param('projectId');
  const body = await c.req.json();
  const id = c.env.AUTHORITY.idFromName(projectId);
  const stub = c.env.AUTHORITY.get(id);
  const response = await stub.fetch(`http://internal/leases/acquire`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, projectId }),
  });

  return response;
});

app.post('/v1/projects/:projectId/leases/heartbeat', async (c) => {
  if (!authorized(c.req.raw, c.env)) {
    return unauthorized(c);
  }

  const projectId = c.req.param('projectId');
  const body = await c.req.json();
  const id = c.env.AUTHORITY.idFromName(projectId);
  const stub = c.env.AUTHORITY.get(id);
  const response = await stub.fetch(`http://internal/leases/heartbeat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, projectId }),
  });

  return response;
});

app.post('/v1/projects/:projectId/leases/release', async (c) => {
  if (!authorized(c.req.raw, c.env)) {
    return unauthorized(c);
  }

  const projectId = c.req.param('projectId');
  const body = await c.req.json();
  const id = c.env.AUTHORITY.idFromName(projectId);
  const stub = c.env.AUTHORITY.get(id);
  const response = await stub.fetch(`http://internal/leases/release`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, projectId }),
  });

  return response;
});

export default app;
