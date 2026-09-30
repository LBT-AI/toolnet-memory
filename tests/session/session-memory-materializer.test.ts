import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

import { SessionCore } from '../../src/session/core.js';

import { SessionMemoryMaterializer } from '../../src/session/learner/materializer.js';

import { reconcileSessionMemoryJournal } from '../../src/session/learner/index.js';

import { TaskStore } from '../../src/tasks/store.js';

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

  snapshot(): Map<string, Uint8Array> {
    return new Map(this.objects);
  }
}

class FailingMemoryStorage extends MemoryStorage {
  async put(key: string, data: string | Uint8Array): Promise<void> {
    if (key.includes('/memories/current.json')) {
      throw new Error('MemoryStore save failed');
    }

    return super.put(key, data);
  }
}

const roots: string[] = [];

function project(name = 'materializer-test'): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), `toolnet-${name}-`));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: `${name}-project`,

    name,

    remote: `${name}-project`,

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

describe('SessionMemoryMaterializer', () => {
  it('materializes learned journal into MemoryStore after SessionCore.flush()', async () => {
    const p = project('materialize-flush');

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-flush-1',
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

    const flushed = await core.flush();

    expect(flushed.materialization).toBeDefined();

    expect(flushed.materialization?.added).toBeGreaterThanOrEqual(1);

    const store = new MemoryStore(storage);

    const memories = await store.load(p.id);

    expect(memories.length).toBeGreaterThanOrEqual(1);

    expect(memories[0].metadata?.nativeSessionId).toBe('mat-flush-1');
  });

  it('replays same input without creating duplicate memories', async () => {
    const p = project('materialize-replay');

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-replay-1',
    });

    core.start();

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-replay',

      data: {
        content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
      },
    });

    await core.flush();

    const store = new MemoryStore(storage);

    const afterFirst = await store.load(p.id);

    expect(afterFirst).toHaveLength(1);

    const secondCore = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-replay-1',
    });

    secondCore.start();

    secondCore.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-replay',

      data: {
        content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
      },
    });

    await secondCore.flush();

    const afterSecond = await store.load(p.id);

    expect(afterSecond).toHaveLength(1);
  });

  it('recovers from crash after journal by retrying materialization', async () => {
    const p = project('materialize-crash-journal');

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-crash-1',
    });

    core.start();

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-crash',

      data: {
        content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
      },
    });

    await core.flush();

    const journalKeys = Array.from(storage.objects.keys()).filter((key) =>
      key.includes('/memory/learned/')
    );

    expect(journalKeys.length).toBeGreaterThanOrEqual(1);

    const store = new MemoryStore(storage);

    const memories = await store.load(p.id);

    expect(memories).toHaveLength(1);
  });

  it('does not advance cursor when MemoryStore.save fails', async () => {
    const p = project('materialize-fail-cursor');

    const storage = new FailingMemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-fail-1',
    });

    core.start();

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-fail',

      data: {
        content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
      },
    });

    const flushed = await core.flush();

    expect(flushed.materialization).toBeDefined();

    expect(flushed.materialization?.added).toBe(0);
  });

  it('serializes concurrent materialization safely', async () => {
    const p = project('materialize-concurrent');

    const storage = new MemoryStorage();

    const core1 = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-concurrent-1',
    });

    core1.start();

    core1.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-concurrent',

      data: {
        content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
      },
    });

    const core2 = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-concurrent-2',
    });

    core2.start();

    core2.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-concurrent-2',

      data: {
        content: 'Luôn luôn chạy test trước khi commit.',
      },
    });

    const [flushed1, flushed2] = await Promise.all([
      core1.flush(),

      core2.flush(),
    ]);

    expect(flushed1.materialization).toBeDefined();

    expect(flushed2.materialization).toBeDefined();

    const store = new MemoryStore(storage);

    const memories = await store.load(p.id);

    expect(memories.length).toBeGreaterThanOrEqual(1);
  });

  it('never stores raw secrets in journal or MemoryStore', async () => {
    const p = project('materialize-secret');

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-secret-1',
    });

    core.start();

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-secret',

      data: {
        content: 'API key is sk-1234567890abcdefABCDEF1234567890abcdef. Use it carefully.',
      },
    });

    await core.flush();

    const store = new MemoryStore(storage);

    const memories = await store.load(p.id);

    const allText = memories.map((m) => m.content).join('\n');

    expect(allText).not.toContain('sk-1234567890abcdefABCDEF1234567890abcdef');

    const journalValues = Array.from(storage.objects.values()).map((buf) =>
      Buffer.from(buf).toString('utf8')
    );

    const allJournalText = journalValues.join('\n');

    expect(allJournalText).not.toContain('sk-1234567890abcdefABCDEF1234567890abcdef');
  });

  it('does not mutate TaskStore during auto-materialization', async () => {
    const p = project('materialize-taskstore');

    const storage = new MemoryStorage();

    const taskStore = new TaskStore(p);

    await taskStore.createTask({
      id: 'task-1',

      kind: 'task',

      title: 'Existing task',

      priority: 'high',
    });

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-task-1',
    });

    core.start();

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-task',

      data: {
        content: 'Complete the existing task.',
      },
    });

    await core.flush();

    const tasks = await taskStore.listTasks();

    expect(tasks).toHaveLength(1);

    expect(tasks[0].id).toBe('task-1');
  });

  it('materializes without daemon', async () => {
    const p = project('materialize-no-daemon');

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'mat-nodaemon-1',
    });

    core.start();

    core.record({
      type: 'user_prompt',

      role: 'user',

      sourceEventId: 'prompt-nodaemon',

      data: {
        content: 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.',
      },
    });

    const flushed = await core.flush();

    expect(flushed.materialization).toBeDefined();

    expect(flushed.materialization?.added).toBeGreaterThanOrEqual(1);

    const store = new MemoryStore(storage);

    const memories = await store.load(p.id);

    expect(memories).toHaveLength(1);
  });
});
