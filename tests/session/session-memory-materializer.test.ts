import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { ConvergentMemoryStore } from '../../src/multi-host/memory-projection.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

import { SessionCore } from '../../src/session/core.js';

import { SessionMemoryMaterializer } from '../../src/session/learner/materializer.js';

import { SessionMemoryLearner } from '../../src/session/learner/learner.js';

import { reconcileSessionMemoryJournal } from '../../src/session/learner/index.js';

import { TaskStore } from '../../src/tasks/store.js';

const RULE = 'Từ giờ luôn chỉ edit source, không được edit production trực tiếp.';

const TEST_RULE = 'Luôn luôn chạy test trước khi commit.';

class MemoryStorage implements StorageProvider {
  readonly name = 'memory';

  readonly objects = new Map<string, Uint8Array>();

  readonly putCounts = new Map<string, number>();

  failWrite: (key: string) => boolean = () => false;

  async put(key: string, data: string | Uint8Array) {
    if (this.failWrite(key)) {
      throw new Error('storage write failed');
    }

    this.putCounts.set(key, (this.putCounts.get(key) ?? 0) + 1);

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

  memoryKey(projectId: string): string {
    return `projects/${projectId}/memories/current.json`;
  }

  memoryWriteCount(projectId: string): number {
    return this.putCounts.get(this.memoryKey(projectId)) ?? 0;
  }

  operationKeys(projectId: string): string[] {
    return Array.from(this.objects.keys()).filter((key) =>
      key.startsWith(`projects/${projectId}/operations/memory/`)
    );
  }

  textValues(): string {
    return Array.from(this.objects.values())
      .map((value) => Buffer.from(value).toString('utf8'))
      .join('\n');
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/* Widen the read-then-write window so concurrent materializations overlap. */
class SlowMemoryReadStorage extends MemoryStorage {
  async getText(key: string) {
    if (key.endsWith('/memories/current.json')) {
      await delay(15);
    }

    return super.getText(key);
  }

  async put(key: string, data: string | Uint8Array) {
    if (key.includes('/operations/memory/') || key.endsWith('/memories/current.json')) {
      await delay(15);
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

function startCore(
  p: ProjectManifest,
  storage: StorageProvider,
  nativeSessionId: string
): SessionCore {
  const core = new SessionCore({
    project: p,

    storage,

    agent: 'opencode',

    nativeSessionId,
  });

  core.start();

  return core;
}

function recordPrompt(core: SessionCore, sourceEventId: string, content: string): void {
  core.record({
    type: 'user_prompt',

    role: 'user',

    sourceEventId,

    data: { content },
  });
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
  it('materializes learned journal into MemoryStore before flush returns', async () => {
    const p = project('materialize-flush');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-flush-1');

    recordPrompt(core, 'prompt-1', RULE);

    const flushed = await core.flush();

    expect(flushed.materialization?.status).toBe('ok');

    expect(flushed.materialization?.added).toBeGreaterThanOrEqual(1);

    const memories = await new MemoryStore(storage).load(p.id);

    expect(memories.length).toBeGreaterThanOrEqual(1);

    expect(memories[0].metadata?.nativeSessionId).toBe('mat-flush-1');
  });

  it('replays the same session/materialization without creating duplicate memories', async () => {
    const p = project('materialize-replay');

    const storage = new MemoryStorage();

    const first = startCore(p, storage, 'mat-replay-1');

    recordPrompt(first, 'prompt-replay', RULE);

    await first.flush();

    const store = new MemoryStore(storage);

    expect(await store.load(p.id)).toHaveLength(1);

    const second = startCore(p, storage, 'mat-replay-1');

    recordPrompt(second, 'prompt-replay', RULE);

    await second.flush();

    expect(await store.load(p.id)).toHaveLength(1);

    const replay = await new SessionMemoryMaterializer(storage).materialize(p, second.identity);

    expect(replay.status).toBe('noop');

    expect(replay.added).toBe(0);

    expect(await store.load(p.id)).toHaveLength(1);
  });

  it('recovers exactly once after a failed MemoryStore save', async () => {
    const p = project('materialize-crash-journal');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-crash-1');

    recordPrompt(core, 'prompt-crash', RULE);

    storage.failWrite = (key) => key.includes('/memories/') || key.includes('/operations/memory/');

    const failed = await core.flush();

    expect(failed.materialization?.status).toBe('failed');

    expect(failed.materialization?.errorCode).toBe('memory-store-save-failed');

    expect(await new MemoryStore(storage).load(p.id)).toHaveLength(0);

    expect(storage.operationKeys(p.id)).toHaveLength(0);

    const learnedBatches = Array.from(storage.objects.keys()).filter((key) =>
      key.includes('/memory/learned/')
    );

    expect(learnedBatches.length).toBeGreaterThanOrEqual(1);

    storage.failWrite = () => false;

    const retried = await core.flush();

    expect(retried.materialization?.status).toBe('ok');

    expect(retried.materialization?.added).toBe(1);

    expect(await new MemoryStore(storage).load(p.id)).toHaveLength(1);
  });

  it('does not create duplicate memory when only the memory cache write fails', async () => {
    const p = project('materialize-cache-failure');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-cache-1');

    recordPrompt(core, 'prompt-cache', RULE);

    storage.failWrite = (key) => key.endsWith('/memories/current.json');

    const failed = await core.flush();

    expect(failed.materialization?.status).toBe('failed');

    const convergent = await new ConvergentMemoryStore(storage).load(p.id);

    expect(convergent).toHaveLength(1);

    storage.failWrite = () => false;

    const retried = await core.flush();

    expect(retried.materialization?.status).not.toBe('failed');

    const convergentAfter = await new ConvergentMemoryStore(storage).load(p.id);

    expect(convergentAfter).toHaveLength(1);
  });

  it('does not rewrite MemoryStore when there are no new candidates', async () => {
    const p = project('materialize-noop');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-noop-1');

    recordPrompt(core, 'prompt-noop', RULE);

    await core.flush();

    const writesAfterFirst = storage.memoryWriteCount(p.id);

    const operationsAfterFirst = storage.operationKeys(p.id).length;

    const second = await core.flush();

    expect(second.materialization?.status).toBe('noop');

    expect(second.materialization?.added).toBe(0);

    expect(storage.memoryWriteCount(p.id)).toBe(writesAfterFirst);

    expect(storage.operationKeys(p.id).length).toBe(operationsAfterFirst);
  });

  it('derives a stable operation id from immutable journal input', async () => {
    const p = project('materialize-operation-id');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-opid-1');

    recordPrompt(core, 'prompt-opid', RULE);

    const flushed = await core.flush();

    const first = flushed.materialization?.operationId;

    expect(first).toBeTruthy();

    const retry = await new SessionMemoryMaterializer(storage).materialize(p, core.identity);

    expect(retry.operationId).toBe(first);

    const growth = startCore(p, storage, 'mat-opid-2');

    recordPrompt(growth, 'prompt-opid-2', TEST_RULE);

    const flushedGrowth = await growth.flush();

    expect(flushedGrowth.materialization?.operationId).not.toBe(first);
  });

  it('keeps concurrent same-candidate materializations idempotent', async () => {
    const p = project('materialize-concurrent');

    const storage = new SlowMemoryReadStorage();

    const core = startCore(p, storage, 'mat-concurrent-shared');

    recordPrompt(core, 'prompt-concurrent', RULE);

    const learner = new SessionMemoryLearner({
      project: p,

      storage,

      identity: core.identity,

      wal: core.wal,
    });

    await learner.learnNew();

    const [first, second] = await Promise.all([
      new SessionMemoryMaterializer(storage).materialize(p, core.identity),

      new SessionMemoryMaterializer(storage).materialize(p, core.identity),
    ]);

    expect([first.status, second.status]).not.toContain('failed');

    const convergent = await new ConvergentMemoryStore(storage).load(p.id);

    expect(convergent).toHaveLength(1);
  });

  it('keeps concurrent distinct-candidate materializations convergent', async () => {
    const p = project('materialize-concurrent-distinct');

    const storage = new SlowMemoryReadStorage();

    const core1 = startCore(p, storage, 'mat-concurrent-a');

    recordPrompt(core1, 'prompt-concurrent-a', RULE);

    const core2 = startCore(p, storage, 'mat-concurrent-b');

    recordPrompt(core2, 'prompt-concurrent-b', TEST_RULE);

    await Promise.all([core1.flush(), core2.flush()]);

    const convergent = await new ConvergentMemoryStore(storage).load(p.id);

    expect(convergent.length).toBeGreaterThanOrEqual(1);

    const fingerprints = convergent.map((memory) => memory.metadata?.learningFingerprint);

    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it('never stores raw secrets in the WAL, learned journal or MemoryStore', async () => {
    const p = project('materialize-secret');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-secret-1');

    const secret = 'sk-1234567890abcdefABCDEF1234567890abcdef';

    recordPrompt(core, 'prompt-secret', `API key is ${secret}. Use it carefully.`);

    await core.flush();

    const walText = readFileSync(core.wal.eventsFile, 'utf8');

    expect(walText).not.toContain(secret);

    const memories = await new MemoryStore(storage).load(p.id);

    const memoryText = memories.map((memory) => memory.content).join('\n');

    expect(memoryText).not.toContain(secret);

    expect(storage.textValues()).not.toContain(secret);
  });

  it('does not mutate TaskStore during materialization', async () => {
    const p = project('materialize-taskstore');

    const storage = new MemoryStorage();

    const taskStore = new TaskStore(p);

    await taskStore.createTask({
      id: 'task-1',

      kind: 'task',

      title: 'Existing task',

      priority: 'high',
    });

    const before = JSON.stringify(await taskStore.listTasks());

    const core = startCore(p, storage, 'mat-task-1');

    recordPrompt(core, 'prompt-task', RULE);

    await core.flush();

    const after = JSON.stringify(await taskStore.listTasks());

    expect(after).toBe(before);

    expect(await taskStore.listTasks()).toHaveLength(1);
  });

  it('materializes without a daemon', async () => {
    const p = project('materialize-no-daemon');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-nodaemon-1');

    recordPrompt(core, 'prompt-nodaemon', RULE);

    const flushed = await core.flush();

    expect(flushed.materialization?.status).toBe('ok');

    expect(flushed.materialization?.added).toBeGreaterThanOrEqual(1);

    expect(await new MemoryStore(storage).load(p.id)).toHaveLength(1);
  });

  it('treats startup and manual reconciliation as a no-op once current', async () => {
    const p = project('materialize-reconcile');

    const storage = new MemoryStorage();

    const core = startCore(p, storage, 'mat-reconcile-1');

    recordPrompt(core, 'prompt-reconcile', RULE);

    await core.flush();

    const startup = await reconcileSessionMemoryJournal(p, storage);

    expect(startup.added).toBe(0);

    const manual = await reconcileSessionMemoryJournal(p, storage);

    expect(manual.added).toBe(0);

    expect(await new MemoryStore(storage).load(p.id)).toHaveLength(1);
  });
});
