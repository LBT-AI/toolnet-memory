import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { syncAgySession } from '../../src/session/agy/index.js';

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

function makeProject(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'agy-project',

    name: 'Mercedes',

    remote: 'Mercedes',

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

describe('Agy adapter', () => {
  it('uses conversation UUID and incrementally reads transcript.jsonl', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = join(project.rootPath, 'transcript.jsonl');

    writeFileSync(
      transcript,
      [
        JSON.stringify({
          role: 'user',

          content: 'hello',
        }),

        JSON.stringify({
          role: 'assistant',

          content: 'hi',
        }),

        '',
      ].join('\n')
    );

    const id = '09b96c5e-2d82-4c36-90a3-196b2de5626f';

    const first = await syncAgySession({
      project,
      storage,

      conversationId: id,

      transcriptPath: transcript,

      workspacePaths: [project.rootPath],

      phase: 'stop',

      fullyIdle: true,

      terminationReason: 'model_stop',
    });

    expect(first.imported).toBe(4);

    expect(first.status).toBe('idle');

    const second = await syncAgySession({
      project,
      storage,

      conversationId: id,

      transcriptPath: transcript,

      phase: 'stop',

      fullyIdle: true,

      terminationReason: 'model_stop',
    });

    expect(second.imported).toBe(0);

    appendFileSync(
      transcript,
      JSON.stringify({
        role: 'user',

        content: 'continue',
      }) + '\n'
    );

    const third = await syncAgySession({
      project,
      storage,

      conversationId: id,

      transcriptPath: transcript,

      phase: 'post',
    });

    expect(third.imported).toBe(1);

    expect(third.status).toBe('active');
  });

  it('redacts transcript secrets before remote storage', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = join(project.rootPath, 'transcript.jsonl');

    writeFileSync(
      transcript,
      JSON.stringify({
        role: 'user',

        token: 'secret-value',

        cookie: 'cookie-value',
      }) + '\n'
    );

    await syncAgySession({
      project,
      storage,

      conversationId: 'agy-secret-test',

      transcriptPath: transcript,

      phase: 'post',
    });

    const all = Array.from(storage.objects.values())
      .map((value) => Buffer.from(value).toString('utf8'))
      .join('\n');

    expect(all).not.toContain('secret-value');

    expect(all).not.toContain('cookie-value');

    expect(all).toContain('[REDACTED]');
  });
});
