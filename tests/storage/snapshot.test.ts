import { mkdtemp, rm } from 'node:fs/promises';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import { SnapshotManager } from '../../src/snapshot/manager.js';

describe('Snapshot Manager', () => {
  it('creates and restores project state', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'toolnet-snapshot-'));

    try {
      const storage = new LocalStorageProvider(dir);

      const key = 'projects/test/memories/current.json';

      await storage.put(
        key,
        JSON.stringify({
          value: 'before',
        })
      );

      const manager = new SnapshotManager(storage);

      const snapshot = await manager.create('test', 'test');

      expect(snapshot).toBeTruthy();

      await storage.put(
        key,
        JSON.stringify({
          value: 'after',
        })
      );

      await manager.restore('test', snapshot!.id);

      const restored = JSON.parse((await storage.getText(key))!);

      expect(restored.value).toBe('before');
    } finally {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    }
  });

  it('prunes old snapshots', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'toolnet-snapshot-'));

    try {
      const storage = new LocalStorageProvider(dir);

      await storage.put('projects/test/memories/current.json', '{}');

      const manager = new SnapshotManager(storage);

      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5));

        await manager.create('test', `snapshot-${i}`);
      }

      await manager.prune('test', 2);

      expect((await manager.list('test')).length).toBe(2);
    } finally {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    }
  });
});
