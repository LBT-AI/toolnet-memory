import { mkdtemp, rm } from 'node:fs/promises';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { HookRuntime } from '../../src/hooks/runtime.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

describe('Real Hooks', () => {
  it('captures and persists events', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'toolnet-hooks-'));

    try {
      const memory = new MemoryEngine();

      const storage = new LocalStorageProvider(dir);

      const store = new MemoryStore(storage);

      const runtime = new HookRuntime({
        projectId: 'test',

        memory,
        memoryStore: store,

        maxEventsBeforeFlush: 100,
      });

      await runtime.sessionStart();

      await runtime.fileWrite('src/auth.ts');

      await runtime.command('npm test', 0);

      await runtime.decision('Use PostgreSQL');

      await runtime.todo('Add vector search');

      await runtime.sessionEnd();

      const saved = await store.load('test');

      expect(saved.length).toBe(5);

      expect(saved.some((item) => item.type === 'decision')).toBe(true);

      expect(saved.some((item) => item.type === 'todo')).toBe(true);
    } finally {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    }
  });
});
