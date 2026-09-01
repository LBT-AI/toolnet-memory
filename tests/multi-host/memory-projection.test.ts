import { describe, expect, it } from 'vitest';

import type { MemoryRecord } from '../../src/core/types.js';

import { ConvergentMemoryStore } from '../../src/multi-host/memory-projection.js';

import { multiHostOperationPrefix } from '../../src/multi-host/operation-log.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

class TestStorage implements StorageProvider {
  readonly name = 'phase6c1-test';

  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array, contentType?: string): Promise<void> {
    void contentType;

    this.objects.set(key, typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.objects.get(key);

    if (!value) {
      return null;
    }

    return new Uint8Array(value);
  }

  async getText(key: string): Promise<string | null> {
    const value = this.objects.get(key);

    if (!value) {
      return null;
    }

    return Buffer.from(value).toString('utf8');
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,

        size: value.length,
      }));
  }
}

function memory(id: string, content: string, updatedAt: string): MemoryRecord {
  return {
    id,

    projectId: 'phase6c-project',

    type: 'decision',

    content,

    importance: 'high',

    importanceScore: 0.85,

    source: 'phase6c-test',

    tags: ['phase6c'],

    metadata: {
      candidateFingerprint: `fp-${id}`,
    },

    createdAt: '2026-09-02T05:00:00.000Z',

    updatedAt,
  };
}

describe('Convergent memory projection', () => {
  it('keeps memories from two independent hosts', async () => {
    const storage = new TestStorage();

    const hostA = new ConvergentMemoryStore(storage, {
      hostId: 'vps-a',
    });

    const hostB = new ConvergentMemoryStore(storage, {
      hostId: 'vps-b',
    });

    const first = memory('memory-a', 'A survives', '2026-09-02T05:01:00.000Z');

    const second = memory('memory-b', 'B survives', '2026-09-02T05:01:01.000Z');

    await Promise.all([
      hostA.save('phase6c-project', [first]),

      hostB.save('phase6c-project', [second]),
    ]);

    const loaded = await hostA.load('phase6c-project');

    expect(loaded.map((item) => item.id)).toEqual(['memory-a', 'memory-b']);
  });

  it('rebuilds complete memory when current.json is stale', async () => {
    const storage = new TestStorage();

    const convergent = new ConvergentMemoryStore(storage, {
      hostId: 'vps-a',
    });

    const first = memory('memory-a', 'A', '2026-09-02T05:02:00.000Z');

    const second = memory('memory-b', 'B', '2026-09-02T05:02:01.000Z');

    await convergent.save('phase6c-project', [first, second]);

    /*
     * Simulate another old host overwriting
     * memories/current.json with stale data.
     */
    await new MemoryStore(storage).save('phase6c-project', [first]);

    const loaded = await convergent.load('phase6c-project');

    expect(loaded.map((item) => item.id)).toEqual(['memory-a', 'memory-b']);
  });

  it('rebuilds from operations when current.json is missing', async () => {
    const storage = new TestStorage();

    const convergent = new ConvergentMemoryStore(storage, {
      hostId: 'vps-a',
    });

    await convergent.save('phase6c-project', [
      memory('memory-a', 'A', '2026-09-02T05:03:00.000Z'),

      memory('memory-b', 'B', '2026-09-02T05:03:01.000Z'),
    ]);

    await storage.delete('projects/phase6c-project/memories/current.json');

    const loaded = await convergent.load('phase6c-project');

    expect(loaded).toHaveLength(2);
  });

  it('makes exact host retry idempotent', async () => {
    const storage = new TestStorage();

    const convergent = new ConvergentMemoryStore(storage, {
      hostId: 'vps-a',
    });

    const item = memory('memory-retry', 'retry', '2026-09-02T05:04:00.000Z');

    await convergent.save('phase6c-project', [item]);

    await convergent.save('phase6c-project', [item]);

    const objects = await storage.list(multiHostOperationPrefix('phase6c-project', 'memory'));

    expect(objects).toHaveLength(1);
  });

  it('treats legacy current.json only as projection input', async () => {
    const storage = new TestStorage();

    const convergent = new ConvergentMemoryStore(storage, {
      hostId: 'vps-a',
    });

    const old = memory('same-id', 'old', '2026-09-02T05:05:00.000Z');

    const latest = memory('same-id', 'latest', '2026-09-02T05:06:00.000Z');

    await new MemoryStore(storage).save('phase6c-project', [old]);

    await convergent.save('phase6c-project', [latest]);

    /*
     * Make legacy projection stale again.
     */
    await new MemoryStore(storage).save('phase6c-project', [old]);

    const loaded = await convergent.load('phase6c-project');

    expect(loaded).toHaveLength(1);

    expect(loaded[0]?.content).toBe('latest');
  });
});
