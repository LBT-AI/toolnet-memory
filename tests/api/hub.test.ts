import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

import { MemoryHubService, MemoryHubStore } from '../../src/hub/index.js';

import { createApiServer } from '../../src/api/server.js';

class FakeStorage {
  private readonly data = new Map<string, string>();

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }
}

async function close(server: ReturnType<typeof createApiServer>): Promise<void> {
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

describe('Memory Hub HTTP API', () => {
  it('enforces ACL and creates hub resources', async () => {
    const project: ProjectManifest = {
      id: 'hub-api-test',
      name: 'hub-api-test',
      remote: 'hub-api-test',
      rootPath: '/tmp/hub-api-test',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      graphVersion: 0,
      memoryVersion: 0,
    };

    const memory = new MemoryEngine();

    const retrieval = new RetrievalEngine(memory);

    const hub = new MemoryHubService(new MemoryHubStore(new FakeStorage(), project, 'owner'));

    await hub.initialize();

    const server = createApiServer({
      project,
      retrieval,
      hub,
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    try {
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('No API test address');
      }

      const base = `http://127.0.0.1:${address.port}`;

      const anonymous = await fetch(`${base}/v1/hub`);

      expect(anonymous.status).toBe(403);

      const ownerHeaders = {
        'x-toolnet-principal': 'owner',
      };

      const summary = await fetch(`${base}/v1/hub`, {
        headers: ownerHeaders,
      });

      expect(summary.status).toBe(200);

      const createTeam = await fetch(`${base}/v1/hub/teams`, {
        method: 'POST',
        headers: {
          ...ownerHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: 'core',
          name: 'Core',
        }),
      });

      expect(createTeam.status).toBe(201);

      const createAgent = await fetch(`${base}/v1/hub/agents`, {
        method: 'POST',
        headers: {
          ...ownerHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: 'codex',
          name: 'Codex',
          teamIds: ['core'],
        }),
      });

      expect(createAgent.status).toBe(201);

      const loadouts = await fetch(`${base}/v1/hub/loadouts`, {
        headers: ownerHeaders,
      });

      const body = await loadouts.json();

      expect(body.loadouts).toHaveLength(1);
      expect(body.loadouts[0].agentId).toBe('codex');
    } finally {
      await close(server);
    }
  });
});
