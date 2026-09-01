import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { bindToolNetCliSession } from '../../src/session/toolnet-cli/project-binding.js';

import { recoverBoundToolNetCliSessions } from '../../src/session/toolnet-cli/recovery.js';

import { toolNetCliSessionFile } from '../../src/session/toolnet-cli/adapter.js';

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

function project(rootPath: string, id: string): ProjectManifest {
  return {
    id,

    name: id,

    rootPath,

    createdAt: '2026-09-01T00:00:00.000Z',

    updatedAt: '2026-09-01T00:00:00.000Z',

    graphVersion: 1,

    memoryVersion: 1,
  };
}

function writeSession(file: string, sessionId: string, content: string): void {
  writeFileSync(
    file,
    JSON.stringify(
      {
        sessionId,

        messages: [
          {
            role: 'user',

            content,
          },
        ],

        metadata: {
          name: sessionId,
        },

        updatedAt: '2026-09-01T01:00:00.000Z',
      },
      null,
      2
    )
  );
}

describe('ToolNet CLI bound-session recovery', () => {
  it('recovers only sessions bound to the current project', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-cli-recovery-'));

    const sessionsDir = join(root, 'native-sessions');

    mkdirSync(sessionsDir, {
      recursive: true,
    });

    const bindingFile = join(root, 'bindings.json');

    const projectA = project(join(root, 'project-a'), 'project-a');

    const projectB = project(join(root, 'project-b'), 'project-b');

    try {
      bindToolNetCliSession(projectA, 'sess_a1', {
        bindingFile,
      });

      bindToolNetCliSession(projectA, 'sess_a2', {
        bindingFile,
      });

      bindToolNetCliSession(projectB, 'sess_b1', {
        bindingFile,
      });

      writeSession(toolNetCliSessionFile('sess_a1', sessionsDir), 'sess_a1', 'project A one');

      writeSession(toolNetCliSessionFile('sess_a2', sessionsDir), 'sess_a2', 'project A two');

      writeSession(toolNetCliSessionFile('sess_b1', sessionsDir), 'sess_b1', 'project B');

      const result = await recoverBoundToolNetCliSessions({
        project: projectA,

        storage: new TestStorage(),

        sessionsDir,

        bindingFile,

        localOnly: true,
      });

      expect(result.bound).toBe(2);

      expect(result.synced).toBe(2);

      expect(result.missing).toBe(0);

      expect(result.failed).toBe(0);

      expect(result.importedMessages).toBe(2);

      expect(result.sessions.map((item) => item.nativeSessionId)).toEqual(['sess_a1', 'sess_a2']);

      const second = await recoverBoundToolNetCliSessions({
        project: projectA,

        storage: new TestStorage(),

        sessionsDir,

        bindingFile,

        localOnly: true,
      });

      expect(second.importedMessages).toBe(0);

      expect(second.recordedEvents).toBe(0);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('reports missing bound native sessions without importing others', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-cli-missing-'));

    const sessionsDir = join(root, 'native-sessions');

    mkdirSync(sessionsDir, {
      recursive: true,
    });

    const bindingFile = join(root, 'bindings.json');

    const current = project(root, 'project-current');

    try {
      bindToolNetCliSession(current, 'sess_missing', {
        bindingFile,
      });

      const result = await recoverBoundToolNetCliSessions({
        project: current,

        storage: new TestStorage(),

        sessionsDir,

        bindingFile,

        localOnly: true,
      });

      expect(result.bound).toBe(1);

      expect(result.synced).toBe(0);

      expect(result.missing).toBe(1);

      expect(result.failed).toBe(0);

      expect(result.sessions[0]?.status).toBe('missing');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
