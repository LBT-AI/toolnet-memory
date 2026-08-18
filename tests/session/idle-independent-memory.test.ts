import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { SessionCore } from '../../src/session/core.js';

class MemoryStorage implements StorageProvider {
  readonly name = 'memory';

  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array) {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
  }

  async get(key: string) {
    return this.objects.get(key) ?? null;
  }

  async getText(key: string) {
    const value = await this.get(key);

    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string) {
    return this.objects.has(key);
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,

        size: value.byteLength,
      }));
  }
}

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-no-idle-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'no-idle-project',

    name: 'no-idle-project',

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, {
      recursive: true,
      force: true,
    });
  }
});

describe('Idle-independent durable learning', () => {
  it('persists learned memory on normal flush without session_idle', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'codex',

      nativeSessionId: 'thread-no-idle',
    });

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-1',

      data: {
        content: 'Từ giờ bắt buộc dùng optimistic locking khi cập nhật order.',
      },
    });

    core.record({
      type: 'decision',

      sourceEventId: 'decision-1',

      data: {
        content: 'Quyết định: dùng version column cho optimistic locking.',
      },
    });

    /*
     * Normal flush only.
     * No idle(), no end().
     */
    await core.flush();

    const learnedKeys = Array.from(storage.objects.keys()).filter(
      (key) => key.includes('/memory/learned/') && key.includes('/batches/')
    );

    expect(learnedKeys.length).toBeGreaterThan(0);

    const payload = learnedKeys
      .map((key) => Buffer.from(storage.objects.get(key)!).toString('utf8'))
      .join('\n');

    expect(payload).toContain('optimistic locking');
  });
});
