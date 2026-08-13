import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { MemoryEngine } from '../../src/core/memory-engine.js';
import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

import { MemoryHubService, MemoryHubStore } from '../../src/hub/index.js';

import { WikiService, WikiStore } from '../../src/wiki/index.js';

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

describe('Wiki HTTP API', () => {
  it('enforces Wiki ACL and supports page workflow', async () => {
    const project: ProjectManifest = {
      id: 'wiki-api',
      name: 'wiki-api',
      remote: 'wiki-api',
      rootPath: '/tmp/wiki-api',
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

    const memory = new MemoryEngine();

    const server = createApiServer({
      project,
      retrieval: new RetrievalEngine(memory),
      hub,
      wiki,
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    try {
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('No Wiki API address');
      }

      const base = `http://127.0.0.1:${address.port}`;

      const denied = await fetch(`${base}/v1/wiki`);

      expect(denied.status).toBe(403);

      const headers = {
        'x-toolnet-principal': 'owner',
        'content-type': 'application/json',
      };

      const created = await fetch(`${base}/v1/wiki/pages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Architecture',
          content: '# Architecture',
          tags: ['core'],
        }),
      });

      expect(created.status).toBe(201);

      const second = await fetch(`${base}/v1/wiki/pages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Memory Hub',
          content: 'See [[Architecture]].',
        }),
      });

      expect(second.status).toBe(201);

      const search = await fetch(`${base}/v1/wiki/search?q=architecture`, {
        headers,
      });

      const searchBody = await search.json();

      expect(searchBody.results.length).toBeGreaterThan(0);

      const backlinks = await fetch(`${base}/v1/wiki/pages/architecture/backlinks`, {
        headers,
      });

      const backlinksBody = await backlinks.json();

      expect(backlinksBody.pages[0].slug).toBe('memory-hub');
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
