import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';
import type { ProjectManifest } from '../../src/core/types.js';
import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';
import { createApiServer } from '../../src/api/server.js';

async function closeServer(server: ReturnType<typeof createApiServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function startServer(token?: string): Promise<{
  url: string;
  server: ReturnType<typeof createApiServer>;
  rootPath: string;
}> {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-api-test-'));

  const project: ProjectManifest = {
    id: 'api-test-project',
    name: 'api-test-project',
    remote: 'api-test-project',
    rootPath,
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };

  const memory = new MemoryEngine();

  const retrieval = new RetrievalEngine(memory);

  const server = createApiServer({
    project,
    retrieval,
    token,
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    await closeServer(server);
    throw new Error('API test server has no TCP address');
  }

  return {
    server,
    rootPath,
    url: `http://127.0.0.1:${address.port}`,
  };
}

describe('ToolNet Memory HTTP API', () => {
  it('enforces bearer authentication', async () => {
    const test = await startServer('secret');

    try {
      const unauthorized = await fetch(`${test.url}/v1/health`);

      expect(unauthorized.status).toBe(401);

      const authorized = await fetch(`${test.url}/v1/health`, {
        headers: {
          authorization: 'Bearer secret',
        },
      });

      expect(authorized.status).toBe(200);

      const body = await authorized.json();

      expect(body).toMatchObject({
        ok: true,
        schema: 'toolnet.api-health.v1',
      });
    } finally {
      await closeServer(test.server);
      rmSync(test.rootPath, { recursive: true, force: true });
    }
  });

  it('serves deterministic memory and skill search routes', async () => {
    const test = await startServer();

    try {
      const memoryResponse = await fetch(`${test.url}/v1/memory/search`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: 'missing memory',
          limit: 5,
        }),
      });

      expect(memoryResponse.status).toBe(200);

      expect(await memoryResponse.json()).toEqual({
        schema: 'toolnet.api-memory-search.v1',
        results: [],
      });

      const skillResponse = await fetch(`${test.url}/v1/skills/search`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: 'run tests',
          limit: 5,
        }),
      });

      expect(skillResponse.status).toBe(200);

      expect(await skillResponse.json()).toMatchObject({
        schema: 'toolnet.api-skill-search.v1',
        result: {
          schema: 'toolnet.skill-memory-search.v1',
          count: 0,
          matches: [],
        },
      });
    } finally {
      await closeServer(test.server);
      rmSync(test.rootPath, { recursive: true, force: true });
    }
  });
});
