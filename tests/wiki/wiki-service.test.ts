import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { WikiService, WikiStore, extractWikiLinks, wikiSlug } from '../../src/wiki/index.js';

class FakeStorage {
  private readonly data = new Map<string, string>();

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }
}

function project(): ProjectManifest {
  return {
    id: 'wiki-test',
    name: 'wiki-test',
    remote: 'wiki-test',
    rootPath: '/tmp/wiki-test',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

describe('WikiService', () => {
  it('normalizes slugs and extracts wiki links', () => {
    expect(wikiSlug('Kiến Trúc ToolNet')).toBe('kien-truc-toolnet');

    expect(extractWikiLinks('See [[Architecture]] and [[Memory Hub]].')).toEqual([
      'architecture',
      'memory-hub',
    ]);
  });

  it('creates, searches, revisions and backlinks', async () => {
    const wiki = new WikiService(new WikiStore(new FakeStorage(), project()));

    await wiki.initialize();

    await wiki.createPage({
      title: 'Architecture',
      content: '# Architecture\nToolNet memory layers.',
      tags: ['architecture', 'memory'],
    });

    await wiki.createPage({
      title: 'Memory Hub',
      content: '# Memory Hub\nSee [[Architecture]] for the core design.',
      tags: ['hub'],
    });

    const search = await wiki.search('architecture', 5);

    expect(search[0]?.page.slug).toBe('architecture');

    const backlinks = await wiki.backlinks('architecture');

    expect(backlinks.map((page) => page.slug)).toEqual(['memory-hub']);

    const updated = await wiki.updatePage('architecture', {
      content: '# Architecture\nUpdated durable knowledge.',
    });

    expect(updated.revision).toBe(2);

    const history = await wiki.history('architecture');

    expect(history.map((item) => item.revision)).toEqual([2, 1]);

    const summary = await wiki.summary();

    expect(summary.pages).toBe(2);
    expect(summary.revisions).toBe(3);
  });
});
