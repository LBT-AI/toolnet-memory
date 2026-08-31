import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { SessionCore } from '../../src/session/core.js';

class NeverRemoteStorage implements StorageProvider {
  readonly name = 'never-remote';

  calls = 0;

  private touched(): never {
    this.calls += 1;

    throw new Error('remote storage must not be used');
  }

  async put(_key: string, _data: string | Uint8Array): Promise<void> {
    this.touched();
  }

  async get(_key: string): Promise<Uint8Array | null> {
    return this.touched();
  }

  async getText(_key: string): Promise<string | null> {
    return this.touched();
  }

  async exists(_key: string): Promise<boolean> {
    return this.touched();
  }

  async delete(_key: string): Promise<void> {
    this.touched();
  }

  async list(_prefix = ''): Promise<StorageObject[]> {
    return this.touched();
  }
}

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-crash-safe-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'crash-safe-project',

    name: 'crash-safe-project',

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, {
      recursive: true,
      force: true,
    });
  }
});

describe('Crash-safe continuous capture', () => {
  it('persists WAL + current work before any remote flush', () => {
    const p = project();

    const storage = new NeverRemoteStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'ses-crash-test',

      eventContext: {
        source: 'opencode',

        cwd: p.rootPath,
      },
    });

    core.recordMany([
      {
        type: 'user_prompt',

        sourceEventId: 'prompt-1',

        data: {
          content: [
            'TODO 1: Implement OAuth callback',
            'TODO 1 đang làm',
            'Next: run auth tests',
          ].join('\n'),
        },
      },

      {
        type: 'file_edit',

        sourceEventId: 'edit-1',

        data: {
          filePath: 'src/auth/callback.ts',
        },
      },
    ]);

    /*
     * Simulate abrupt process death HERE.
     * No core.flush().
     */

    expect(storage.calls).toBe(0);

    const walFile = join(
      p.rootPath,
      '.toolnet',
      'runtime', 'sources',
      'opencode',
      'ses-crash-test',
      'events.jsonl'
    );

    expect(existsSync(walFile)).toBe(true);

    const wal = readFileSync(walFile, 'utf8');

    expect(wal).toContain('Implement OAuth callback');

    expect(wal).toContain('"sessionId":"ses-crash-test"');

    const currentFile = join(p.rootPath, '.toolnet', 'work', 'current.json');

    expect(existsSync(currentFile)).toBe(true);

    const current = JSON.parse(readFileSync(currentFile, 'utf8'));

    expect(current.currentTask?.title).toContain('OAuth callback');

    expect(current.filesTouched).toContain('src/auth/callback.ts');

    expect(current.nextActions.join(' ')).toContain('run auth tests');
  });
});
