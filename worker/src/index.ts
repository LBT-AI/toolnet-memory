import { Hono } from 'hono';
import { Authority } from './authority.js';

export { Authority } from './authority.js';

interface Env {
  AUTHORITY: DurableObjectNamespace<Authority>;
  MEMORY_EVENTS: R2Bucket;
  TOOLNET_AUTH_TOKEN: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ status: 'ok', service: 'toolnet-memory-authority' }));

app.get('/v1/projects/:projectId/state', async (c) => {
  const projectId = c.req.param('projectId');
  const authHeader = c.req.header('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== c.env.TOOLNET_AUTH_TOKEN) {
    return c.json({ error: { code: 'AUTHORITY_AUTH_FAILED', message: 'Invalid or missing token' } }, 401);
  }

  const id = c.env.AUTHORITY.idFromName(projectId);
  const stub = c.env.AUTHORITY.get(id);
  const response = await stub.fetch(`http://internal/state`, { method: 'GET' });

  return response;
});

app.post('/v1/projects/:projectId/commit', async (c) => {
  const projectId = c.req.param('projectId');
  const authHeader = c.req.header('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== c.env.TOOLNET_AUTH_TOKEN) {
    return c.json({ error: { code: 'AUTHORITY_AUTH_FAILED', message: 'Invalid or missing token' } }, 401);
  }

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
  const projectId = c.req.param('projectId');
  const authHeader = c.req.header('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== c.env.TOOLNET_AUTH_TOKEN) {
    return c.json({ error: { code: 'AUTHORITY_AUTH_FAILED', message: 'Invalid or missing token' } }, 401);
  }

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
  const projectId = c.req.param('projectId');
  const authHeader = c.req.header('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== c.env.TOOLNET_AUTH_TOKEN) {
    return c.json({ error: { code: 'AUTHORITY_AUTH_FAILED', message: 'Invalid or missing token' } }, 401);
  }

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
  const projectId = c.req.param('projectId');
  const authHeader = c.req.header('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== c.env.TOOLNET_AUTH_TOKEN) {
    return c.json({ error: { code: 'AUTHORITY_AUTH_FAILED', message: 'Invalid or missing token' } }, 401);
  }

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