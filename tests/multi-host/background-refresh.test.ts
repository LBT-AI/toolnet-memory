import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { MemoryRecord, ProjectManifest } from '../../src/core/types.js';

import type { SessionIdentity } from '../../src/session/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { ConvergentMemoryStore } from '../../src/multi-host/memory-projection.js';

import {
  refreshProjectStateOnce,
  startProjectBackgroundRefresh,
} from '../../src/multi-host/background-refresh.js';

import { WorkObservationJournal } from '../../src/work-continuity/journal.js';

import type { WorkObservation } from '../../src/work-continuity/types.js';

class TestStorage implements StorageProvider {
  readonly name = 'phase6c3a-test';

  readonly objects = new Map<string, Uint8Array>();

  failLists = false;

  async put(key: string, data: string | Uint8Array, contentType?: string): Promise<void> {
    void contentType;

    this.objects.set(key, typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.objects.get(key);

    if (!value) {
      return null;
    }

    return new Uint8Array(value);
  }

  async getText(key: string): Promise<string | null> {
    const value = this.objects.get(key);

    if (!value) {
      return null;
    }

    return Buffer.from(value).toString('utf8');
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    if (this.failLists) {
      throw new Error('temporary remote failure');
    }

    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,

        size: value.length,
      }));
  }
}

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-refresh-'));

  roots.push(rootPath);

  return {
    id: 'phase6c3-project',

    name: 'Phase 6C3',

    rootPath,

    createdAt: '2026-09-02T07:00:00.000Z',

    updatedAt: '2026-09-02T07:00:00.000Z',

    graphVersion: 1,

    memoryVersion: 1,
  };
}

function memory(p: ProjectManifest): MemoryRecord {
  return {
    id: 'memory-background',

    projectId: p.id,

    type: 'decision',

    content: 'Background memory survives',

    importance: 'high',

    importanceScore: 0.9,

    tags: ['background'],

    source: 'phase6c3-test',

    createdAt: '2026-09-02T07:01:00.000Z',

    updatedAt: '2026-09-02T07:01:00.000Z',
  };
}

function identity(p: ProjectManifest): SessionIdentity {
  const localDirectory = join(p.rootPath, '.toolnet', 'runtime', 'sources', 'codex', 'session-1');

  mkdirSync(localDirectory, {
    recursive: true,
  });

  return {
    projectId: p.id,

    projectName: p.name,

    projectRoot: p.rootPath,

    agent: 'codex',

    nativeSessionId: 'session-1',

    sessionKey: 'codex:session-1',

    remotePrefix: `projects/${p.id}/runtime/sources/codex/session-1`,

    localDirectory,
  };
}

function observation(p: ProjectManifest): WorkObservation {
  return {
    version: 1,

    id: 'work-background',

    projectId: p.id,

    kind: 'decision',

    key: 'work-background',

    text: 'Background work survives',

    confidence: 0.95,

    occurredAt: '2026-09-02T07:02:00.000Z',

    sequence: 1,

    agent: 'codex',

    nativeSessionId: 'session-1',

    sessionKey: 'codex:session-1',

    eventId: 'event-work-background',
  };
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();

    if (!root) {
      continue;
    }

    rmSync(root, {
      recursive: true,

      force: true,
    });
  }
});

describe('Background project refresh', () => {
  it('rebuilds memory and work caches from durable sources', async () => {
    const storage = new TestStorage();

    const p = project();

    const memoryStore = new ConvergentMemoryStore(storage, {
      hostId: 'vps-a',
    });

    await memoryStore.save(p.id, [memory(p)]);

    const journal = new WorkObservationJournal(storage);

    await journal.write(identity(p), [observation(p)]);

    await storage.delete(`projects/${p.id}/memories/current.json`);

    await storage.delete(`projects/${p.id}/work/current.json`);

    const result = await refreshProjectStateOnce(p, storage);

    expect(result.memories).toBe(1);

    expect(result.workAvailable).toBe(true);

    expect(await storage.exists(`projects/${p.id}/memories/current.json`)).toBe(true);

    expect(await storage.exists(`projects/${p.id}/work/current.json`)).toBe(true);
  });

  it('does not create new memory operations while refreshing', async () => {
    const storage = new TestStorage();

    const p = project();

    const memoryStore = new ConvergentMemoryStore(storage, {
      hostId: 'vps-a',
    });

    await memoryStore.save(p.id, [memory(p)]);

    const before = (await storage.list(`projects/${p.id}/operations/memory/`)).length;

    await refreshProjectStateOnce(p, storage);

    await refreshProjectStateOnce(p, storage);

    const after = (await storage.list(`projects/${p.id}/operations/memory/`)).length;

    expect(after).toBe(before);
  });

  it('isolates remote refresh failure from the caller', async () => {
    const storage = new TestStorage();

    const p = project();

    storage.failLists = true;

    const errors: string[] = [];

    const controller = startProjectBackgroundRefresh({
      project: p,

      storage,

      initialDelayMs: 60_000,

      intervalMs: 60_000,

      retryCooldownMs: 60_000,

      onError: (error) => {
        errors.push(error.message);
      },
    });

    const result = await controller.runOnce();

    expect(result).toBeNull();

    expect(controller.status().failedRuns).toBe(1);

    expect(errors).toEqual(['temporary remote failure']);

    controller.stop();

    expect(controller.status().running).toBe(false);
  });

  it('exposes successful refresh status', async () => {
    const storage = new TestStorage();

    const p = project();

    const controller = startProjectBackgroundRefresh({
      project: p,

      storage,

      initialDelayMs: 60_000,
    });

    const result = await controller.runOnce();

    expect(result).not.toBeNull();

    expect(controller.status().runs).toBe(1);

    expect(controller.status().successfulRuns).toBe(1);

    expect(controller.status().failedRuns).toBe(0);

    controller.stop();
  });
});
