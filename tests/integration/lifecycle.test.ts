import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ProjectManager } from '../../src/core/index.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import { ToolNetMemoryRuntime } from '../../src/runtime/toolnet-memory-runtime.js';

describe('ToolNet Memory Lifecycle', () => {
  it('auto loads retrieves flushes indexes and persists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'toolnet-life-'));

    const repo = join(dir, 'repo');

    const storageDir = join(dir, 'storage');

    await import('node:fs/promises').then(({ mkdir }) =>
      mkdir(repo, {
        recursive: true,
      })
    );

    try {
      await writeFile(
        join(repo, 'app.ts'),
        `
function login() {
  return true;
}

function main() {
  return login();
}
`
      );

      const project = new ProjectManager().detect(repo);

      const storage = new LocalStorageProvider(storageDir);

      const first = new ToolNetMemoryRuntime({
        project,
        storage,
        embeddingModel: 'hash-test',
      });

      await first.start();

      await first.hooks.decision('Dùng remote memory storage');

      await first.hooks.todo('TODO hoàn thiện MCP');

      const stopped = await first.stop();

      expect(stopped.memories).toBeGreaterThan(0);

      expect(stopped.code.symbols).toBeGreaterThan(0);

      const second = new ToolNetMemoryRuntime({
        project,
        storage,
        embeddingModel: 'hash-test',
      });

      const loaded = await second.start();

      expect(loaded.memories).toBeGreaterThan(0);

      expect(loaded.graphSymbols).toBeGreaterThan(0);

      const prompt = await second.preparePrompt('Tiếp tục remote storage');

      expect(prompt.context).toContain('remote memory storage');

      await second.stop();
    } finally {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    }
  });
});
