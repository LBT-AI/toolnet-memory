import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { bindToolNetCliSession } from '../../src/session/toolnet-cli/project-binding.js';

import { toolNetCliSessionFile } from '../../src/session/toolnet-cli/adapter.js';

import { startBoundToolNetCliWatcher } from '../../src/session/toolnet-cli/watcher.js';

class TestStorage implements StorageProvider {
  readonly name = 'test';

  async put(): Promise<void> {}

  async get(): Promise<Uint8Array | null> {
    return null;
  }

  async getText(): Promise<string | null> {
    return null;
  }

  async exists(): Promise<boolean> {
    return false;
  }

  async delete(): Promise<void> {}

  async list(): Promise<StorageObject[]> {
    return [];
  }
}

function project(rootPath: string): ProjectManifest {
  return {
    id: 'watch-project',

    name: 'watch-project',

    rootPath,

    createdAt: '2026-09-01T00:00:00.000Z',

    updatedAt: '2026-09-01T00:00:00.000Z',

    graphVersion: 1,

    memoryVersion: 1,
  };
}

describe('ToolNet CLI bound-session watcher', () => {
  it('incrementally syncs an explicitly bound native session', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-cli-watch-'));

    const sessionsDir = join(root, 'native-sessions');

    mkdirSync(sessionsDir, {
      recursive: true,
    });

    const bindingFile = join(root, 'bindings.json');

    const current = project(root);

    const sessionId = 'sess_watch_x1';

    const sessionFile = toolNetCliSessionFile(sessionId, sessionsDir);

    try {
      bindToolNetCliSession(current, sessionId, {
        bindingFile,
      });

      writeFileSync(
        sessionFile,
        JSON.stringify({
          sessionId,

          messages: [
            {
              role: 'user',

              content: 'first',
            },
          ],

          updatedAt: '2026-09-01T01:00:00.000Z',
        })
      );

      const watcher = startBoundToolNetCliWatcher({
        project: current,

        storage: new TestStorage(),

        sessionsDir,

        bindingFile,

        localOnly: true,

        intervalMs: 60_000,
      });

      const first = await watcher.runOnce();

      expect(first.importedMessages).toBe(1);

      const parsed = JSON.parse(
        JSON.stringify({
          sessionId,

          messages: [
            {
              role: 'user',

              content: 'first',
            },
            {
              role: 'assistant',

              content: 'second',
            },
          ],

          updatedAt: '2026-09-01T01:01:00.000Z',
        })
      );

      writeFileSync(sessionFile, JSON.stringify(parsed));

      const second = await watcher.runOnce();

      expect(second.importedMessages).toBe(1);

      expect(second.recordedEvents).toBe(1);

      const third = await watcher.runOnce();

      expect(third.importedMessages).toBe(0);

      expect(third.recordedEvents).toBe(0);

      const status = watcher.status();

      expect(status.runs).toBe(3);

      expect(status.successfulRuns).toBe(3);

      expect(status.importedMessages).toBe(2);

      expect(status.recordedEvents).toBe(2);

      watcher.stop();

      expect(watcher.status().running).toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
