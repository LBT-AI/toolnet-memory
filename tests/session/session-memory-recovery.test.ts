import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { createSessionIdentity } from '../../src/session/identity.js';

import { SessionWal } from '../../src/session/wal.js';

import { ConvergentMemoryStore } from '../../src/multi-host/memory-projection.js';

import { reconcileSessionMemoryJournal } from '../../src/session/learner/journal.js';

import {
  inspectRecovery,
  recoverSessionMemory,
  RecoveryError,
} from '../../src/session/learner/recovery.js';

import { inspectMemoryPipeline } from '../../src/production/memory-pipeline-status.js';

const RULE = 'From now on always run the full test suite before every commit.';

const SECRET = 'sk-live-RECOVERY-LEAK-1234567890';

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

class MemoryStorage implements StorageProvider {
  readonly name = 'recovery-test';

  readonly objects = new Map<string, Uint8Array>();

  failMemoryStoreSaveOnce = false;

  private failed = false;

  async put(key: string, data: string | Uint8Array): Promise<void> {
    if (this.failMemoryStoreSaveOnce && !this.failed && key.endsWith('/memories/current.json')) {
      this.failed = true;

      throw new Error('simulated save failure');
    }

    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.objects.get(key) ?? null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);

    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix: string = ''): Promise<StorageObject[]> {
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.byteLength }));
  }
}

const roots: string[] = [];

let counter = 0;

function makeProject(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'recovery-'));

  roots.push(root);

  counter += 1;

  const now = new Date().toISOString();

  return {
    id: `recovery-${counter}`,

    name: `recovery-${counter}`,

    remote: `recovery-${counter}`,

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function appendRule(
  project: ProjectManifest,
  agent: string,
  sessionId: string,
  content: string = RULE
): void {
  const identity = createSessionIdentity(project, agent, sessionId);

  const wal = new SessionWal(identity);

  wal.append([
    {
      type: 'user_prompt',

      role: 'user',

      sourceEventId: `${sessionId}-1`,

      data: { content },
    },
  ]);
}

function writeJournalBatch(
  storage: MemoryStorage,
  project: ProjectManifest,
  options: {
    agent?: string;
    sessionId?: string;
    fingerprint: string;
    content?: string;
    keySuffix?: string;
  }
): void {
  const agent = options.agent ?? 'claude';

  const sessionId = options.sessionId ?? 'sess-1';

  const now = new Date().toISOString();

  const suffix = options.keySuffix ?? options.fingerprint.padEnd(16, 'f').slice(0, 16);

  const key = `projects/${project.id}/memory/learned/batches/000000000001-000000000001-abcdef123456-${suffix}.json`;

  const batch = {
    version: 1,

    projectId: project.id,

    agent,

    nativeSessionId: sessionId,

    sessionKey: `${agent}:${sessionId}`,

    createdAt: now,

    firstSequence: 1,

    lastSequence: 1,

    candidateCount: 1,

    candidates: [
      {
        version: 1,

        fingerprint: options.fingerprint,

        projectId: project.id,

        agent,

        nativeSessionId: sessionId,

        sessionKey: `${agent}:${sessionId}`,

        kind: 'rule',

        type: 'project_rule',

        content: options.content ?? RULE,

        confidence: 0.9,

        importance: 'high',

        tags: [],

        evidence: {
          userExplicit: true,
          sourceVerified: false,
          testVerified: false,
          crossSessionConfirmations: 1,
          assistantDerived: false,
        },

        provenance: { agent, nativeSessionId: sessionId, sessionKey: `${agent}:${sessionId}` },

        createdAt: now,
      },
    ],
  };

  storage.objects.set(key, Buffer.from(JSON.stringify(batch)));
}

function writeMemoryStore(
  storage: MemoryStorage,
  project: ProjectManifest,
  fingerprints: string[],
  content: string = RULE
): void {
  const now = new Date().toISOString();

  const records = fingerprints.map((fingerprint) => ({
    id: `mem-${fingerprint}`,

    projectId: project.id,

    type: 'project_rule',

    content,

    importance: 'high',

    tags: [],

    createdAt: now,

    updatedAt: now,

    source: 'session-memory-learner',

    metadata: { learningFingerprint: fingerprint },
  }));

  storage.objects.set(
    `projects/${project.id}/memories/current.json`,
    Buffer.from(JSON.stringify(records))
  );
}

async function memoryCount(storage: MemoryStorage, project: ProjectManifest): Promise<number> {
  return (await new ConvergentMemoryStore(storage).load(project.id)).length;
}

function snapshotTree(root: string): string {
  const lines: string[] = [];

  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const full = join(directory, entry.name);

      if (entry.isDirectory()) {
        lines.push(`D ${full}`);

        walk(full);

        continue;
      }

      lines.push(`F ${full} ${readFileSync(full).length}`);
    }
  };

  walk(root);

  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* State machine                                                       */
/* ------------------------------------------------------------------ */

describe('recovery state machine', () => {
  it('classifies an empty project', async () => {
    const project = makeProject();

    const inspection = await inspectRecovery(project, new MemoryStorage());

    expect(inspection.state).toBe('empty');
  });

  it('classifies WAL-only state', async () => {
    const project = makeProject();

    appendRule(project, 'claude', 'sess-wal');

    const inspection = await inspectRecovery(project, new MemoryStorage());

    expect(inspection.state).toBe('wal-only');

    expect(inspection.walPendingSessions).toBe(1);
  });

  it('classifies journal pending with an empty store as memorystore-missing', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, { fingerprint: 'fp-a' });

    const inspection = await inspectRecovery(project, storage);

    expect(inspection.state).toBe('memorystore-missing');

    expect(inspection.journalPending).toBe(1);
  });

  it('classifies partial materialization', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, { fingerprint: 'fp-a' });

    writeJournalBatch(storage, project, { fingerprint: 'fp-b' });

    writeMemoryStore(storage, project, ['fp-a']);

    const inspection = await inspectRecovery(project, storage);

    expect(inspection.state).toBe('partially-materialized');
  });

  it('classifies a current project', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, { fingerprint: 'fp-a' });

    writeMemoryStore(storage, project, ['fp-a']);

    const inspection = await inspectRecovery(project, storage);

    expect(inspection.state).toBe('current');
  });

  it('classifies a corrupt journal', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    storage.objects.set(
      `projects/${project.id}/memory/learned/batches/000000000001-000000000001-abcdef123456-deadbeefdeadbeef.json`,
      Buffer.from('{ not json')
    );

    const inspection = await inspectRecovery(project, storage);

    expect(inspection.state).toBe('corrupt-journal');

    expect(inspection.malformedJournalKeys).toHaveLength(1);
  });

  it('classifies a corrupt MemoryStore', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    storage.objects.set(`projects/${project.id}/memories/current.json`, Buffer.from('{ not json'));

    const inspection = await inspectRecovery(project, storage);

    expect(inspection.state).toBe('corrupt-memorystore');
  });
});

/* ------------------------------------------------------------------ */
/* Recovery behavior                                                   */
/* ------------------------------------------------------------------ */

describe('recovery behavior', () => {
  it('is a no-op for an empty project', async () => {
    const project = makeProject();

    const report = await recoverSessionMemory({ project, storage: new MemoryStorage() });

    expect(report.finalStatus).toBe('already-current');

    expect(report.memoriesAdded).toBe(0);
  });

  it('recovers WAL-only state through the canonical learner', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-wal');

    const report = await recoverSessionMemory({ project, storage });

    expect(report.detectedState).toBe('wal-only');

    expect(report.finalStatus).toBe('recovered');

    expect(report.journalBatchesAdded).toBeGreaterThanOrEqual(1);

    expect(await memoryCount(storage, project)).toBeGreaterThan(0);
  });

  it('recovers journal-only state without regenerating candidates', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, { fingerprint: 'fp-j' });

    const report = await recoverSessionMemory({ project, storage });

    expect(report.detectedState).toBe('memorystore-missing');

    expect(report.finalStatus).toBe('recovered');

    expect(report.journalBatchesAdded).toBe(0);

    expect(await memoryCount(storage, project)).toBe(1);
  });

  it('completes partial materialization idempotently', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, { fingerprint: 'fp-a' });

    writeJournalBatch(storage, project, { fingerprint: 'fp-b' });

    writeMemoryStore(storage, project, ['fp-a']);

    const report = await recoverSessionMemory({ project, storage });

    expect(report.detectedState).toBe('partially-materialized');

    expect(await memoryCount(storage, project)).toBe(2);
  });

  it('is idempotent and does not rewrite current state', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-idem');

    await recoverSessionMemory({ project, storage });

    const before = snapshotTree(project.rootPath);

    const second = await recoverSessionMemory({ project, storage });

    expect(second.detectedState).toBe('current');

    expect(second.finalStatus).toBe('already-current');

    expect(second.memoriesAdded).toBe(0);

    expect(second.journalBatchesAdded).toBe(0);

    expect(snapshotTree(project.rootPath)).toBe(before);
  });

  it('recovers a memory store that was lost while the journal survived', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, { fingerprint: 'fp-lost' });

    const report = await recoverSessionMemory({ project, storage });

    expect(report.finalStatus).toBe('recovered');

    expect(await memoryCount(storage, project)).toBe(1);
  });

  it('blocks on a corrupt journal without advancing anything', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    storage.objects.set(
      `projects/${project.id}/memory/learned/batches/000000000001-000000000001-abcdef123456-deadbeefdeadbeef.json`,
      Buffer.from('{ not json')
    );

    await expect(recoverSessionMemory({ project, storage })).rejects.toMatchObject({
      code: 'RECOVERY_JOURNAL_CORRUPT',
    });

    expect(await storage.getText(`projects/${project.id}/memories/current.json`)).toBeNull();
  });

  it('never silently overwrites a corrupt MemoryStore', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const corrupt = '{ not json';

    storage.objects.set(`projects/${project.id}/memories/current.json`, Buffer.from(corrupt));

    await expect(recoverSessionMemory({ project, storage })).rejects.toMatchObject({
      code: 'RECOVERY_MEMORYSTORE_CORRUPT',
    });

    expect(await storage.getText(`projects/${project.id}/memories/current.json`)).toBe(corrupt);
  });

  it('resumes after a mid-backfill storage failure without duplicates', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, { fingerprint: 'fp-mid-a' });

    writeJournalBatch(storage, project, { fingerprint: 'fp-mid-b' });

    storage.failMemoryStoreSaveOnce = true;

    await expect(recoverSessionMemory({ project, storage })).rejects.toBeInstanceOf(RecoveryError);

    /* Retry converges to the correct store without duplicating journal data. */
    await recoverSessionMemory({ project, storage });

    expect(await memoryCount(storage, project)).toBe(2);

    const again = await recoverSessionMemory({ project, storage });

    expect(again.finalStatus).toBe('already-current');

    expect(again.memoriesAdded).toBe(0);

    expect(await memoryCount(storage, project)).toBe(2);
  });

  it('repairs a truncated WAL tail during recovery', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-trunc');

    const identity = createSessionIdentity(project, 'claude', 'sess-trunc');

    const eventsFile = join(identity.localDirectory, 'events.jsonl');

    /* Simulate a crash that left a partial JSON record without a newline. */
    writeFileSync(eventsFile, `${readFileSync(eventsFile, 'utf8')}{"version":1,"id":"partial"`);

    const report = await recoverSessionMemory({ project, storage });

    expect(report.finalStatus).toBe('recovered');

    expect(await memoryCount(storage, project)).toBeGreaterThan(0);
  });

  it('keeps a zero-candidate session healthy and unchanged', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-empty', 'ok thanks');

    const report = await recoverSessionMemory({ project, storage });

    expect(report.finalStatus).toBe('already-current');

    expect(await memoryCount(storage, project)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Dry-run                                                             */
/* ------------------------------------------------------------------ */

describe('dry-run', () => {
  it('is strictly read-only and reports pending work', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-dry');

    writeJournalBatch(storage, project, { fingerprint: 'fp-dry' });

    const treeBefore = snapshotTree(project.rootPath);

    const storageBefore = JSON.stringify([...storage.objects.entries()].sort());

    const report = await recoverSessionMemory({ project, storage, dryRun: true });

    expect(report.dryRun).toBe(true);

    expect(report.finalStatus).toBe('dry-run');

    expect(report.memoriesAdded).toBe(0);

    expect(snapshotTree(project.rootPath)).toBe(treeBefore);

    expect(JSON.stringify([...storage.objects.entries()].sort())).toBe(storageBefore);
  });
});

/* ------------------------------------------------------------------ */
/* Authority & safety                                                  */
/* ------------------------------------------------------------------ */

describe('recovery authority and safety', () => {
  it('does not mutate Task state', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    mkdirSync(join(project.rootPath, '.toolnet', 'tasks'), { recursive: true });

    writeFileSync(
      join(project.rootPath, '.toolnet', 'tasks', 'state.json'),
      JSON.stringify({ version: 1, tasks: [{ id: 't1', status: 'in_progress' }] })
    );

    appendRule(project, 'claude', 'sess-task');

    const before = snapshotTree(join(project.rootPath, '.toolnet', 'tasks'));

    await recoverSessionMemory({ project, storage });

    expect(snapshotTree(join(project.rootPath, '.toolnet', 'tasks'))).toBe(before);
  });

  it('never imports unrelated native agent memory', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const native = join(project.rootPath, '.claude');

    mkdirSync(native, { recursive: true });

    writeFileSync(join(native, 'memory.json'), JSON.stringify({ rule: RULE }));

    const report = await recoverSessionMemory({ project, storage });

    expect(report.finalStatus).toBe('already-current');

    expect(await memoryCount(storage, project)).toBe(0);
  });

  it('keeps secrets out of all durable recovery output', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-secret', `From now on always use API_KEY=${SECRET}`);

    await recoverSessionMemory({ project, storage });

    const durable = [...storage.objects.values()].map((value) => Buffer.from(value).toString());

    expect(durable.join('\n')).not.toContain(SECRET);
  });

  it('does not leak memory across projects', async () => {
    const projectA = makeProject();

    const projectB = makeProject();

    const storageA = new MemoryStorage();

    const storageB = new MemoryStorage();

    appendRule(projectA, 'claude', 'sess-a');

    await recoverSessionMemory({ project: projectA, storage: storageA });

    const reportB = await recoverSessionMemory({ project: projectB, storage: storageB });

    expect(reportB.finalStatus).toBe('already-current');

    expect(await memoryCount(storageB, projectB)).toBe(0);
  });

  it('never rewrites the read-only legacy sessions tree', async () => {
    const project = makeProject();

    const legacy = join(project.rootPath, '.toolnet', 'sessions', 'claude', 'legacy-1');

    mkdirSync(legacy, { recursive: true });

    writeFileSync(
      join(legacy, 'state.json'),
      JSON.stringify({
        version: 1,
        projectId: project.id,
        agent: 'claude',
        nativeSessionId: 'legacy-1',
        status: 'idle',
        createdAt: '2026-09-30T00:00:00.000Z',
        updatedAt: '2026-09-30T00:00:00.000Z',
        lastSequence: 1,
        lastRemoteSequence: 1,
        remoteByteOffset: 0,
        sourceCursors: {},
        recentEventIds: [],
      })
    );

    writeFileSync(join(legacy, 'events.jsonl'), '{"version":1}\n');

    const before = snapshotTree(join(project.rootPath, '.toolnet', 'sessions'));

    const storage = new MemoryStorage();

    const report = await recoverSessionMemory({ project, storage });

    expect(report.detectedState).toBe('empty');

    expect(snapshotTree(join(project.rootPath, '.toolnet', 'sessions'))).toBe(before);

    expect(await memoryCount(storage, project)).toBe(0);
  });

  it('is safe under same-process concurrent recovery', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-concurrent');

    const [first, second] = await Promise.all([
      recoverSessionMemory({ project, storage }),
      recoverSessionMemory({ project, storage }),
    ]);

    expect([first.finalStatus, second.finalStatus]).toContain('recovered');

    const count = await memoryCount(storage, project);

    expect(count).toBe(1);

    /* A follow-up recovery converges to a single, current memory. */
    const after = await recoverSessionMemory({ project, storage });

    expect(after.finalStatus).toBe('already-current');

    expect(await memoryCount(storage, project)).toBe(1);
  });

  it('handles a moderate backlog in bounded passes', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    for (let index = 0; index < 25; index += 1) {
      appendRule(
        project,
        'claude',
        `sess-${index}`,
        `From now on rule ${index}: always run the full suite.`
      );
    }

    const report = await recoverSessionMemory({ project, storage });

    expect(report.finalStatus).toBe('recovered');

    expect(report.memoriesAdded).toBe(25);

    const again = await recoverSessionMemory({ project, storage });

    expect(again.finalStatus).toBe('already-current');

    expect(again.memoriesAdded).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Integration with existing recovery paths                            */
/* ------------------------------------------------------------------ */

describe('recovery integration', () => {
  it('leaves status current after recovery', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-status');

    await recoverSessionMemory({ project, storage });

    const pipeline = await inspectMemoryPipeline({
      project,
      storage,
      detections: [
        {
          agent: 'claude',
          detected: true,
          commandDetected: true,
          configDetected: true,
          evidence: [],
        } as never,
      ],
    });

    expect(pipeline.materialization.state).toBe('current');

    expect(pipeline.pendingMaterialization).toBe(0);

    expect(pipeline.overall).not.toBe('error');
  });

  it('leaves startup and manual reconcile as no-ops after backfill', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    appendRule(project, 'claude', 'sess-integrated');

    await recoverSessionMemory({ project, storage });

    const startup = await reconcileSessionMemoryJournal(project, storage);

    expect(startup.added).toBe(0);

    expect(startup.evidenceUpdated).toBe(0);

    const manual = await reconcileSessionMemoryJournal(project, storage);

    expect(manual.added).toBe(0);
  });

  it('preserves canonical candidate metadata through journal-only recovery', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeJournalBatch(storage, project, {
      fingerprint: 'fp-meta',
      content: 'Always verify with the full test suite',
    });

    await recoverSessionMemory({ project, storage });

    const text = await storage.getText(`projects/${project.id}/memories/current.json`);

    const records = JSON.parse(text!) as Array<{ metadata: Record<string, unknown> }>;

    expect(records[0].metadata.learningFingerprint).toBe('fp-meta');

    expect(records[0].metadata.learningKind).toBe('rule');

    expect(records[0].metadata.evidence).toBeDefined();
  });
});
