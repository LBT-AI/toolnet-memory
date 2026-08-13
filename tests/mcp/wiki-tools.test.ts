import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { WikiService, WikiStore } from '../../src/wiki/index.js';

import { wikiRead } from '../../src/mcp/tools/wiki-read.js';
import { wikiSearch } from '../../src/mcp/tools/wiki-search.js';

class FakeStorage {
  private readonly data = new Map<string, string>();

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }
}

describe('Wiki MCP tools', () => {
  it('searches then reads maintained knowledge', async () => {
    const project: ProjectManifest = {
      id: 'wiki-mcp',
      name: 'wiki-mcp',
      remote: 'wiki-mcp',
      rootPath: '/tmp/wiki-mcp',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      graphVersion: 0,
      memoryVersion: 0,
    };

    const storage = new FakeStorage();

    const wiki = new WikiService(new WikiStore(storage, project));

    await wiki.initialize();

    await wiki.createPage({
      title: 'Release Workflow',
      content: 'Run focused tests, full tests, build, then commit.',
      tags: ['release'],
    });

    const ctx = {
      project,
      storage,
    };

    const search = await wikiSearch(ctx as any, {
      query: 'release workflow',
    });

    expect(search.count).toBe(1);

    const read = await wikiRead(ctx as any, {
      page: 'release-workflow',
    });

    expect(read.page.title).toBe('Release Workflow');
  });
});
