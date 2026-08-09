import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { installCodexNotify, syncCodexSession } from '../../src/session/codex/index.js';

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
  const root = mkdtempSync(join(tmpdir(), 'toolnet-codex-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'codex-project',

    name: 'ToolNetSecrets',

    remote: 'ToolNetSecrets',

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

describe('Codex adapter', () => {
  it('imports canonical rollout incrementally using native thread id', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const threadId = 'b5f6c1c2-1111-2222-3333-444455556666';

    const rollout = join(project.rootPath, `rollout-${threadId}.jsonl`);

    const lines = [
      {
        timestamp: '2026-08-05T00:00:00Z',

        type: 'session_meta',

        payload: {
          id: threadId,

          cwd: project.rootPath,
        },
      },

      {
        timestamp: '2026-08-05T00:00:01Z',

        type: 'response_item',

        payload: {
          type: 'message',

          role: 'user',

          content: [
            {
              type: 'input_text',

              text: 'hello',
            },
          ],
        },
      },

      {
        timestamp: '2026-08-05T00:00:02Z',

        type: 'response_item',

        payload: {
          type: 'message',

          role: 'assistant',

          content: [
            {
              type: 'output_text',

              text: 'hi',
            },
          ],
        },
      },
    ];

    writeFileSync(rollout, lines.map((item) => JSON.stringify(item)).join('\n') + '\n');

    const first = await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,

      cwd: project.rootPath,

      turnId: 'turn-1',

      idle: true,
    });

    expect(first.status).toBe('idle');

    expect(first.imported).toBe(5);

    const second = await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,

      cwd: project.rootPath,

      turnId: 'turn-1',

      idle: true,
    });

    expect(second.imported).toBe(0);

    appendFileSync(
      rollout,
      JSON.stringify({
        timestamp: '2026-08-05T00:01:00Z',

        type: 'event_msg',

        payload: {
          type: 'agent_message',

          message: 'continued',
        },
      }) + '\n'
    );

    const third = await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,

      cwd: project.rootPath,

      turnId: 'turn-2',

      idle: true,
    });

    expect(third.imported).toBe(2);
  });

  it('redacts secrets from rollout payload', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const threadId = 'codex-secret-thread';

    const rollout = join(project.rootPath, 'secret.jsonl');

    writeFileSync(
      rollout,
      JSON.stringify({
        timestamp: '2026-08-05T00:00:00Z',

        type: 'session_meta',

        payload: {
          id: threadId,

          cwd: project.rootPath,

          token: 'top-secret-value',
        },
      }) + '\n'
    );

    await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,

      cwd: project.rootPath,
    });

    const text = Array.from(storage.objects.values())
      .map((item) => Buffer.from(item).toString('utf8'))
      .join('\n');

    expect(text).not.toContain('top-secret-value');

    expect(text).toContain('[REDACTED]');
  });

  it('preserves an existing Codex notify command', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-codex-config-'));

    roots.push(root);

    const config = join(root, 'config.toml');

    const previous = join(root, 'previous.json');

    writeFileSync(
      config,
      [
        'model = "gpt-5"',
        'notify = ["echo", "old-notifier"]',
        '',
        '[sandbox]',
        'mode = "workspace-write"',
        '',
      ].join('\n')
    );

    const result = installCodexNotify({
      configFile: config,

      previousFile: previous,

      binary: '/usr/bin/toolnet-memory',
    });

    expect(result.preservedPrevious).toBe(true);

    const configText = readFileSync(config, 'utf8');

    expect(configText).toContain('session:codex-notify');

    const old = JSON.parse(readFileSync(previous, 'utf8'));

    expect(old).toEqual(['echo', 'old-notifier']);
  });
});
