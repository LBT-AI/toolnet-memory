import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { SessionIdentity } from '../../src/session/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { WorkObservationJournal } from '../../src/work-continuity/journal.js';

import { loadWorkState } from '../../src/work-continuity/reducer.js';

import type { WorkObservation, WorkState } from '../../src/work-continuity/types.js';

class TestStorage implements StorageProvider {
  readonly name = 'phase6c2-test';

  readonly objects = new Map<string, Uint8Array>();

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
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,

        size: value.length,
      }))
      .reverse();
  }
}

const roots: string[] = [];

function project(id = 'phase6c2-project'): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-work-projection-'));

  roots.push(rootPath);

  const now = '2026-09-02T06:00:00.000Z';

  return {
    id,

    name: 'Phase 6C2',

    rootPath,

    createdAt: now,

    updatedAt: now,

    graphVersion: 1,

    memoryVersion: 1,
  };
}

function identity(p: ProjectManifest, agent: string, nativeSessionId: string): SessionIdentity {
  const localDirectory = join(p.rootPath, '.toolnet', 'runtime', 'sources', agent, nativeSessionId);

  mkdirSync(localDirectory, {
    recursive: true,
  });

  return {
    projectId: p.id,

    projectName: p.name,

    projectRoot: p.rootPath,

    agent,

    nativeSessionId,

    sessionKey: `${agent}:${nativeSessionId}`,

    remotePrefix: `projects/${p.id}/runtime/sources/${agent}/${nativeSessionId}`,

    localDirectory,
  };
}

function observation(
  p: ProjectManifest,
  agent: string,
  id: string,
  text: string,
  sequence: number,
  occurredAt: string
): WorkObservation {
  return {
    version: 1,

    id,

    projectId: p.id,

    kind: 'decision',

    key: id,

    text,

    confidence: 0.95,

    occurredAt,

    sequence,

    agent,

    nativeSessionId: `${agent}-session`,

    sessionKey: `${agent}:${agent}-session`,

    eventId: `event-${id}`,
  };
}

function legacyState(p: ProjectManifest, decisions: string[]): WorkState {
  return {
    version: 1,

    projectId: p.id,

    projectName: p.name,

    phases: [],

    tasks: [],

    decisions,

    blockers: [],

    warnings: [],

    nextActions: [],

    filesTouched: [],

    activeFiles: [],

    modifiedFiles: [],

    createdFiles: [],

    deletedFiles: [],

    commands: [],

    tests: [],

    checks: [],

    progress: {
      phasesTotal: 0,

      phasesCompleted: 0,

      tasksTotal: 0,

      tasksCompleted: 0,

      blocked: 0,
    },

    updatedAt: '2026-09-02T05:00:00.000Z',
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

describe('Convergent work projection', () => {
  it('keeps observations from independent Codex and Agy sessions', async () => {
    const storage = new TestStorage();

    const p = project();

    const journal = new WorkObservationJournal(storage);

    await Promise.all([
      journal.write(identity(p, 'codex', 'codex-session'), [
        observation(
          p,
          'codex',
          'decision-a',
          'Codex decision survives',
          1,
          '2026-09-02T06:01:00.000Z'
        ),
      ]),

      journal.write(identity(p, 'agy', 'agy-session'), [
        observation(p, 'agy', 'decision-b', 'Agy decision survives', 1, '2026-09-02T06:01:01.000Z'),
      ]),
    ]);

    const state = await loadWorkState(p, storage);

    expect(state?.decisions).toContain('Codex decision survives');

    expect(state?.decisions).toContain('Agy decision survives');
  });

  it('ignores stale work/current.json when authoritative observations exist', async () => {
    const storage = new TestStorage();

    const p = project();

    const journal = new WorkObservationJournal(storage);

    const codex = observation(
      p,
      'codex',
      'decision-codex',
      'Codex survives stale cache',
      1,
      '2026-09-02T06:02:00.000Z'
    );

    const agy = observation(
      p,
      'agy',
      'decision-agy',
      'Agy survives stale cache',
      1,
      '2026-09-02T06:02:01.000Z'
    );

    await journal.write(identity(p, 'codex', 'codex-session'), [codex]);

    await journal.write(identity(p, 'agy', 'agy-session'), [agy]);

    await storage.put(
      `projects/${p.id}/work/current.json`,
      `${JSON.stringify(legacyState(p, ['STALE ONLY']), null, 2)}\n`,
      'application/json'
    );

    const state = await loadWorkState(p, storage);

    expect(state?.decisions).not.toContain('STALE ONLY');

    expect(state?.decisions).toContain('Codex survives stale cache');

    expect(state?.decisions).toContain('Agy survives stale cache');
  });

  it('rebuilds work state when current.json is missing', async () => {
    const storage = new TestStorage();

    const p = project();

    const journal = new WorkObservationJournal(storage);

    await journal.write(identity(p, 'codex', 'codex-session'), [
      observation(
        p,
        'codex',
        'decision-rebuild',
        'Rebuilt from observations',
        1,
        '2026-09-02T06:03:00.000Z'
      ),
    ]);

    await storage.delete(`projects/${p.id}/work/current.json`);

    const state = await loadWorkState(p, storage);

    expect(state?.decisions).toContain('Rebuilt from observations');

    expect(await storage.exists(`projects/${p.id}/work/current.json`)).toBe(true);
  });

  it('preserves legacy current.json when no observation journal exists', async () => {
    const storage = new TestStorage();

    const p = project('legacy-project');

    await storage.put(
      `projects/${p.id}/work/current.json`,
      `${JSON.stringify(legacyState(p, ['Legacy survives migration']), null, 2)}\n`,
      'application/json'
    );

    const state = await loadWorkState(p, storage);

    expect(state?.decisions).toEqual(['Legacy survives migration']);
  });

  it('makes exact journal retry idempotent', async () => {
    const storage = new TestStorage();

    const p = project();

    const journal = new WorkObservationJournal(storage);

    const source = identity(p, 'codex', 'codex-session');

    const values = [
      observation(p, 'codex', 'retry-event', 'Retry is immutable', 1, '2026-09-02T06:04:00.000Z'),
    ];

    const first = await journal.write(source, values);

    const second = await journal.write(source, values);

    expect(first).toBe(second);

    const objects = await storage.list(`projects/${p.id}/work/observations/`);

    expect(objects).toHaveLength(1);
  });

  it('does not overwrite divergent payloads that reuse the same event id', async () => {
    const storage = new TestStorage();

    const p = project();

    const journal = new WorkObservationJournal(storage);

    const source = identity(p, 'codex', 'codex-session');

    const first = await journal.write(source, [
      observation(p, 'codex', 'same-event', 'Variant A', 1, '2026-09-02T06:05:00.000Z'),
    ]);

    const second = await journal.write(source, [
      observation(p, 'codex', 'same-event', 'Variant B', 1, '2026-09-02T06:05:00.000Z'),
    ]);

    expect(first).not.toBe(second);

    const objects = await storage.list(`projects/${p.id}/work/observations/`);

    expect(objects).toHaveLength(2);
  });
});
