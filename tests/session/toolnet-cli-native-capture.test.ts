import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import {
  syncToolNetCliSession,
  toolNetCliSessionFile,
} from '../../src/session/toolnet-cli/adapter.js';

import { sharedProjectJournalFile } from '../../src/session/shared-project-journal.js';

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

function project(root: string): ProjectManifest {
  return {
    id: 'toolnet-cli-native-test',

    name: 'toolnet-cli-native-test',

    rootPath: root,

    createdAt: '2026-09-01T00:00:00.000Z',

    updatedAt: '2026-09-01T00:00:00.000Z',

    graphVersion: 1,

    memoryVersion: 1,
  };
}

describe('ToolNet CLI native session capture', () => {
  it('imports native session JSON incrementally into shared project journal', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-cli-native-'));

    const sessionsDir = join(root, 'native-sessions');

    const bindingFile = join(root, 'toolnet-cli-bindings.json');

    mkdirSync(sessionsDir, {
      recursive: true,
    });

    const sessionId = 'sess_native_x1';

    const sessionFile = toolNetCliSessionFile(sessionId, sessionsDir);

    try {
      writeFileSync(
        sessionFile,
        JSON.stringify(
          {
            sessionId,

            messages: [
              {
                role: 'user',
                content: 'Implement shared memory capture',
              },
              {
                role: 'assistant',
                content: 'Working on native capture.',
              },
            ],

            metadata: {
              name: 'Native capture test',

              model: 'test-model',

              agentMode: 'build',
            },

            updatedAt: '2026-09-01T01:00:00.000Z',
          },
          null,
          2
        )
      );

      const storage = new TestStorage();

      const first = await syncToolNetCliSession({
        project: project(root),

        storage,

        nativeSessionId: sessionId,

        sessionsDir,

        bindingFile,

        bind: true,

        localOnly: true,
      });

      expect(first.importedMessages).toBe(2);

      expect(first.recordedEvents).toBe(2);

      expect(first.durability).toBe('local');

      const journalAfterFirst = readFileSync(sharedProjectJournalFile(root), 'utf8')
        .trim()
        .split('\n')
        .map(
          (line) =>
            JSON.parse(line) as {
              agent: string;
              type: string;
              role?: string;
            }
        );

      expect(journalAfterFirst.some((event) => event.type === 'session_start')).toBe(true);

      expect(journalAfterFirst.filter((event) => event.agent === 'toolnet-cli').length).toBe(3);

      const second = await syncToolNetCliSession({
        project: project(root),

        storage,

        nativeSessionId: sessionId,

        sessionsDir,

        bindingFile,

        localOnly: true,
      });

      expect(second.importedMessages).toBe(0);

      expect(second.recordedEvents).toBe(0);

      const parsed = JSON.parse(readFileSync(sessionFile, 'utf8')) as {
        messages: Array<Record<string, unknown>>;
      };

      parsed.messages.push({
        role: 'assistant',

        content: 'Native incremental capture completed.',
      });

      writeFileSync(sessionFile, JSON.stringify(parsed, null, 2));

      const third = await syncToolNetCliSession({
        project: project(root),

        storage,

        nativeSessionId: sessionId,

        sessionsDir,

        bindingFile,

        localOnly: true,
      });

      expect(third.importedMessages).toBe(1);

      expect(third.recordedEvents).toBe(1);

      const journalAfterThird = readFileSync(sharedProjectJournalFile(root), 'utf8')
        .trim()
        .split('\n');

      expect(journalAfterThird).toHaveLength(4);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
