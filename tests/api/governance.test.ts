import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

import { MemoryHubService, MemoryHubStore } from '../../src/hub/index.js';

import {
  KnowledgeGovernanceService,
  KnowledgeGovernanceStore,
  WikiService,
  WikiStore,
} from '../../src/wiki/index.js';

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

describe('Governance HTTP API', () => {
  it('enforces ACL and exposes quality/policy', async () => {
    const project: ProjectManifest = {
      id: 'gov-api',
      name: 'gov-api',
      remote: 'gov-api',
      rootPath: '/tmp/gov-api',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      graphVersion: 0,
      memoryVersion: 0,
    };

    const storage = new FakeStorage();

    const hub = new MemoryHubService(new MemoryHubStore(storage, project, 'owner'));

    await hub.initialize();

    const wiki = new WikiService(new WikiStore(storage, project));

    await wiki.initialize();

    const governance = new KnowledgeGovernanceService(
      new KnowledgeGovernanceStore(storage, project)
    );

    await governance.initialize();

    const memory = new MemoryEngine();

    const server = createApiServer({
      project,
      retrieval: new RetrievalEngine(memory),
      hub,
      wiki,
      governance,
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);

      server.listen(0, '127.0.0.1', resolve);
    });

    try {
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('No API address');
      }

      const base = `http://127.0.0.1:${address.port}`;

      const denied = await fetch(`${base}/v1/governance`);

      expect(denied.status).toBe(403);

      const headers = {
        'x-toolnet-principal': 'owner',
        'content-type': 'application/json',
      };

      const summary = await fetch(`${base}/v1/governance`, { headers });

      expect(summary.status).toBe(200);

      const policy = await fetch(`${base}/v1/governance/policy`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          staleAfterDays: 30,
        }),
      });

      expect(policy.status).toBe(200);

      const quality = await fetch(`${base}/v1/governance/quality`, { headers });

      expect(quality.status).toBe(200);
    } finally {
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
  });
});
