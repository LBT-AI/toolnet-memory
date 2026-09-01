import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

import { SessionCore } from '../../src/session/core.js';

import { reconcileSessionMemoryJournal } from '../../src/session/learner/index.js';

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
  const root = mkdtempSync(join(tmpdir(), 'toolnet-learner-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'memory-learner-project',

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

describe('Session Memory Learner', () => {
  it('learns durable rule but does not dump normal chat', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'ses_rule_test',
    });

    core.start();

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-1',

      data: {
        content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
      },
    });

    core.record({
      type: 'assistant_message',

      role: 'assistant',

      sourceEventId: 'answer-1',

      data: {
        content: 'Được rồi.',
      },
    });

    await core.flush();

    const journalKeys = Array.from(storage.objects.keys()).filter((key) =>
      key.includes('/memory/learned/')
    );

    expect(journalKeys.length).toBe(1);

    const hierarchyKeys = Array.from(storage.objects.keys()).filter((key) =>
      key.includes('/memory/hierarchy/')
    );

    expect(hierarchyKeys).toHaveLength(1);

    /*
     * Learner journal must not blindly modify current snapshot.
     */
    const store = new MemoryStore(storage);

    expect(await store.load(p.id)).toHaveLength(0);

    const result = await reconcileSessionMemoryJournal(p, storage);

    expect(result.added).toBe(1);

    const memories = await store.load(p.id);

    expect(memories).toHaveLength(1);

    expect(memories[0].type).toBe('rule');

    expect(memories[0].metadata?.nativeSessionId).toBe('ses_rule_test');

    expect(memories[0].metadata?.learningFingerprint).toBeTruthy();
  });

  it('deduplicates same knowledge across different agents', async () => {
    const p = project();

    const storage = new MemoryStorage();

    for (const [agent, session] of [
      ['agy', 'agy-uuid'],
      ['codex', 'codex-thread'],
    ] as const) {
      const core = new SessionCore({
        project: p,

        storage,

        agent,

        nativeSessionId: session,
      });

      core.record({
        type: 'user_prompt',

        role: 'user',

        data: {
          content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
        },
      });

      await core.flush();
    }

    const result = await reconcileSessionMemoryJournal(p, storage);

    expect(result.added).toBe(1);

    expect(result.duplicates).toBe(1);

    const memories = await new MemoryStore(storage).load(p.id);

    expect(memories).toHaveLength(1);

    const evidence = memories[0].metadata?.evidence as Record<string, unknown> | undefined;

    expect(evidence?.crossSessionConfirmations).toBe(2);

    const confirmingSessionKeys = memories[0].metadata?.confirmingSessionKeys;

    expect(Array.isArray(confirmingSessionKeys) ? confirmingSessionKeys.length : 0).toBe(2);
  });

  it('learns decision, todo, architecture and fix', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'codex',

      nativeSessionId: 'thread-123',
    });

    core.recordMany([
      {
        type: 'user_prompt',

        role: 'user',

        data: {
          content: 'Chốt dùng Session Core làm pipeline chung cho cả ba agent.',
        },
      },

      {
        type: 'user_prompt',

        role: 'user',

        data: {
          content: 'Bước tiếp theo cần thêm retrieval injection cho OpenCode.',
        },
      },

      {
        type: 'assistant_message',

        role: 'assistant',

        data: {
          content: 'Đã sửa lỗi production runtime và toàn bộ tests pass.',
        },
      },
    ]);

    await core.flush();

    await reconcileSessionMemoryJournal(p, storage);

    const memories = await new MemoryStore(storage).load(p.id);

    expect(memories.some((item) => item.type === 'decision')).toBe(true);

    expect(memories.some((item) => item.type === 'todo')).toBe(true);

    expect(memories.some((item) => item.type === 'code')).toBe(true);
  });

  it('keeps session provenance', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'agy',

      nativeSessionId: '09b96c5e-test',
    });

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'native-event-55',

      sourceSequence: 55,

      data: {
        content: 'Không được lưu API key thô vào long-term memory.',
      },

      provenance: {
        source: 'agy-transcript',

        sourcePath: '/tmp/transcript.jsonl',

        sourceOffset: 100,
      },
    });

    await core.flush();

    await reconcileSessionMemoryJournal(p, storage);

    const memories = await new MemoryStore(storage).load(p.id);

    const provenance = memories[0].metadata?.provenance as Record<string, any>;

    expect(provenance.agent).toBe('agy');

    expect(provenance.nativeSessionId).toBe('09b96c5e-test');

    expect(provenance.sourceEventIds).toContain('native-event-55');
  });
});
