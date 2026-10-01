import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import {
  inspectMemoryPipeline,
  memoryPipelineFindings,
} from '../../src/production/memory-pipeline-status.js';

import type {
  AgentDetection,
  AgentIntegrationId,
} from '../../src/production/integration-detection.js';

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

class MemoryStorage implements StorageProvider {
  readonly name = 'memory-pipeline-test';

  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
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
  const root = mkdtempSync(join(tmpdir(), 'mp-status-'));

  roots.push(root);

  counter += 1;

  const now = new Date().toISOString();

  return {
    id: `mp-status-${counter}`,

    name: `mp-status-${counter}`,

    remote: `mp-status-${counter}`,

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

const ALL_AGENTS: AgentIntegrationId[] = [
  'claude',
  'cursor',
  'copilot',
  'grok',
  'kiro',
  'opencode',
  'codex',
  'agy',
  'toolnet-cli',
];

function detections(configured: AgentIntegrationId[] = ALL_AGENTS): AgentDetection[] {
  return ALL_AGENTS.map((agent) => {
    const detected = configured.includes(agent);

    return {
      agent,

      detected,

      commandDetected: detected,

      configDetected: detected,

      evidence: [],
    };
  });
}

function writeSource(
  project: ProjectManifest,
  agent: string,
  sessionId: string,
  options: {
    eventsSize?: number;
    learnerOffset?: number;
    lastSequence?: number;
    lastRemoteSequence?: number;
    updatedAt?: string;
  } = {}
): void {
  const directory = join(project.rootPath, '.toolnet', 'runtime', 'sources', agent, sessionId);

  mkdirSync(directory, { recursive: true });

  const eventsSize = options.eventsSize ?? 64;

  writeFileSync(join(directory, 'events.jsonl'), 'x'.repeat(eventsSize));

  const now = options.updatedAt ?? new Date().toISOString();

  writeFileSync(
    join(directory, 'state.json'),
    JSON.stringify({
      version: 1,

      projectId: project.id,

      agent,

      nativeSessionId: sessionId,

      status: 'idle',

      createdAt: now,

      updatedAt: now,

      lastLocalEventAt: now,

      lastSequence: options.lastSequence ?? 1,

      lastRemoteSequence: options.lastRemoteSequence ?? 1,

      remoteByteOffset: 0,

      sourceCursors: {
        'memory.learner.offset': String(options.learnerOffset ?? eventsSize),
      },

      recentEventIds: [],
    })
  );
}

function journalKey(project: ProjectManifest, fingerprint: string): string {
  const digest = fingerprint.padEnd(16, 'f').slice(0, 16);

  return `projects/${project.id}/memory/learned/batches/000000000001-000000000001-abcdef123456-${digest}.json`;
}

async function writeJournalCandidate(
  storage: MemoryStorage,
  project: ProjectManifest,
  options: { agent?: string; fingerprint: string; content?: string; sessionId?: string }
): Promise<void> {
  const agent = options.agent ?? 'claude';

  const sessionId = options.sessionId ?? 'sess-1';

  const now = new Date().toISOString();

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

        content: options.content ?? 'Always run tests before commit',

        confidence: 0.9,

        importance: 'high',

        tags: [],

        provenance: {
          agent,

          nativeSessionId: sessionId,

          sessionKey: `${agent}:${sessionId}`,

          eventIds: [],

          sourceEventIds: [],

          sourcePaths: [],

          firstSequence: 1,

          lastSequence: 1,
        },

        createdAt: now,
      },
    ],
  };

  await storage.put(journalKey(project, options.fingerprint), JSON.stringify(batch));
}

async function writeMemoryStore(
  storage: MemoryStorage,
  project: ProjectManifest,
  options: { fingerprints?: string[]; content?: string; updatedAt?: string }
): Promise<void> {
  const updatedAt = options.updatedAt ?? new Date().toISOString();

  const records = (options.fingerprints ?? []).map((fingerprint) => ({
    id: `mem-${fingerprint}`,

    projectId: project.id,

    type: 'project_rule',

    content: options.content ?? 'Always run tests before commit',

    importance: 'high',

    tags: [],

    createdAt: updatedAt,

    updatedAt,

    source: 'session-memory-learner',

    metadata: { learningFingerprint: fingerprint },
  }));

  await storage.put(`projects/${project.id}/memories/current.json`, JSON.stringify(records));
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('memory pipeline status', () => {
  it('reports a configured integration with no sessions as idle, never error', async () => {
    const project = makeProject();

    const status = await inspectMemoryPipeline({
      project,

      storage: new MemoryStorage(),

      detections: detections(),
    });

    expect(status.configuration).toBe('configured');

    expect(status.capture.status).toBe('idle');

    expect(status.memoryStore.state).toBe('empty');

    expect(status.overall).toBe('idle');

    expect(status.overall).not.toBe('error');
  });

  it('reports current materialization after a hook session materializes', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeSource(project, 'claude', 'sess-1');

    await writeJournalCandidate(storage, project, { fingerprint: 'fp-1' });

    await writeMemoryStore(storage, project, { fingerprints: ['fp-1'] });

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(status.capture.status).toBe('healthy');

    expect(status.journal.state).toBe('current');

    expect(status.materialization.state).toBe('current');

    expect(status.pendingMaterialization).toBe(0);

    expect(status.overall).toBe('healthy');
  });

  it('detects pending materialization deterministically from journal vs store', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    await writeJournalCandidate(storage, project, { fingerprint: 'fp-pending' });

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(status.journal.state).toBe('pending');

    expect(status.materialization.state).toBe('pending');

    expect(status.pendingMaterialization).toBe(1);

    expect(status.memoryStore.state).toBe('stale');

    expect(status.overall).toBe('warning');

    expect(memoryPipelineFindings(status).some((f) => f.severity === 'warning')).toBe(true);
  });

  it('surfaces an unreadable MemoryStore as a failed materialization with a safe code', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const secret = 'sk-live-DO-NOT-LEAK-1234567890';

    await storage.put(
      `projects/${project.id}/memories/current.json`,
      JSON.stringify({ content: secret })
    );

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(status.memoryStore.state).toBe('corrupt');

    expect(status.materialization.state).toBe('failed');

    expect(status.materialization.errorCode).toBe('memory-store-read-failed');

    expect(status.overall).toBe('error');

    const findings = memoryPipelineFindings(status);

    expect(findings.some((f) => f.severity === 'error')).toBe(true);

    expect(JSON.stringify(status)).not.toContain(secret);

    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it('distinguishes pending WAL work from pending materialization', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeSource(project, 'claude', 'sess-wal', { eventsSize: 128, learnerOffset: 64 });

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(status.wal.state).toBe('pending');

    expect(status.wal.pendingLearnerBytes).toBe(64);

    expect(status.journal.batches).toBe(0);

    expect(status.pendingMaterialization).toBe(0);
  });

  it('treats a fresh project with no memory files as healthy-empty, not corrupt', async () => {
    const project = makeProject();

    const status = await inspectMemoryPipeline({
      project,

      storage: new MemoryStorage(),

      detections: detections(),
    });

    expect(status.memoryStore.state).toBe('empty');

    expect(status.journal.state).toBe('empty');

    expect(status.overall).not.toBe('error');
  });

  it('reports a corrupt MemoryStore as error', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    await storage.put(`projects/${project.id}/memories/current.json`, '{ not json');

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(status.memoryStore.state).toBe('corrupt');

    expect(status.overall).toBe('error');
  });

  it('treats a missing journal with no candidate history as healthy-empty', async () => {
    const project = makeProject();

    const status = await inspectMemoryPipeline({
      project,

      storage: new MemoryStorage(),

      detections: detections(),
    });

    expect(status.journal.state).toBe('empty');

    expect(status.journal.pendingCandidates).toBe(0);
  });

  it('reports a configured manual-sync agent that never synced as idle', async () => {
    const project = makeProject();

    const status = await inspectMemoryPipeline({
      project,

      storage: new MemoryStorage(),

      detections: detections(['opencode']),
    });

    const opencode = status.integrations.find((item) => item.agent === 'opencode')!;

    expect(opencode.configured).toBe(true);

    expect(opencode.captureMode).toBe('hook');

    expect(opencode.captureStatus).toBe('idle');

    expect(opencode.lastCaptureAt).toBeUndefined();

    expect(status.overall).not.toBe('error');
  });

  it('does not claim a hook agent is healthy before it captures anything', async () => {
    const project = makeProject();

    const status = await inspectMemoryPipeline({
      project,

      storage: new MemoryStorage(),

      detections: detections(['claude']),
    });

    const claude = status.integrations.find((item) => item.agent === 'claude')!;

    expect(claude.configured).toBe(true);

    expect(claude.captureMode).toBe('hook');

    expect(claude.captureStatus).toBe('idle');

    expect(claude.captureStatus).not.toBe('healthy');
  });

  it('is healthy with current materialization even though the daemon is not required', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeSource(project, 'claude', 'sess-1');

    await writeJournalCandidate(storage, project, { fingerprint: 'fp-1' });

    await writeMemoryStore(storage, project, { fingerprints: ['fp-1'] });

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(status.requiresDaemon).toBe(false);

    expect(status.overall).toBe('healthy');
  });

  it('keeps memory quality concerns out of pipeline health', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    await writeMemoryStore(storage, project, { fingerprints: ['fp-old'] });

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    /* A store with records but no pending work is a healthy pipeline,
     * independent of whether those memories are fresh or stale. */
    expect(status.materialization.state).toBe('current');

    expect(status.overall).toBe('healthy');
  });

  it('attributes pending materialization to the originating agent', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    await writeJournalCandidate(storage, project, {
      agent: 'opencode',

      sessionId: 'oc-1',

      fingerprint: 'fp-oc',
    });

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    const opencode = status.integrations.find((item) => item.agent === 'opencode')!;

    expect(opencode.pendingMaterialization).toBe(1);

    expect(opencode.materializationStatus).toBe('pending');
  });

  it('never leaks session content or secrets into status output', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const secret = 'sk-live-LEAKME-9999';

    writeSource(project, 'claude', 'sess-secret');

    await writeJournalCandidate(storage, project, {
      fingerprint: 'fp-secret',

      content: `token ${secret}`,
    });

    await writeMemoryStore(storage, project, { content: `token ${secret}` });

    const status = await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(JSON.stringify(status)).not.toContain(secret);

    expect(JSON.stringify(memoryPipelineFindings(status))).not.toContain(secret);
  });

  it('exposes the stable structured field set for JSON consumers', async () => {
    const project = makeProject();

    const status = await inspectMemoryPipeline({
      project,

      storage: new MemoryStorage(),

      detections: detections(),
    });

    for (const key of [
      'configuration',
      'capture',
      'wal',
      'journal',
      'memoryStore',
      'materialization',
      'lastCaptureAt',
      'lastMaterializationAt',
      'pendingMaterialization',
      'requiresDaemon',
      'integrations',
      'overall',
    ]) {
      expect(status).toHaveProperty(key);
    }

    const claude = status.integrations[0]!;

    for (const key of [
      'agent',
      'configured',
      'captureMode',
      'captureStatus',
      'materializationStatus',
      'pendingMaterialization',
    ]) {
      expect(claude).toHaveProperty(key);
    }
  });

  it('does not mutate the project directory or storage', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    writeSource(project, 'claude', 'sess-noop', { eventsSize: 128, learnerOffset: 32 });

    await writeJournalCandidate(storage, project, { fingerprint: 'fp-noop' });

    await writeMemoryStore(storage, project, { fingerprints: [] });

    const treeBefore = snapshotTree(project.rootPath);

    const storageBefore = JSON.stringify([...storage.objects.entries()].sort());

    await inspectMemoryPipeline({ project, storage, detections: detections() });

    await inspectMemoryPipeline({ project, storage, detections: detections() });

    expect(snapshotTree(project.rootPath)).toBe(treeBefore);

    expect(JSON.stringify([...storage.objects.entries()].sort())).toBe(storageBefore);
  });
});

describe('status and doctor wiring', () => {
  it('replaces the misleading automatic-memory wording', () => {
    const source = readFileSync(resolve('src/production/auto-integrate.ts'), 'utf8');

    expect(source).not.toContain('automatic memory enabled');

    expect(source).toContain('hooks installed successfully');

    expect(source).toContain('session:opencode-sync');
  });

  it('wires the pipeline model into status, doctor and the MCP status tool', () => {
    const status = readFileSync(resolve('src/production/status-cli.ts'), 'utf8');

    const doctor = readFileSync(resolve('src/production/doctor.ts'), 'utf8');

    const mcp = readFileSync(resolve('src/mcp/tools/toolnet-status.ts'), 'utf8');

    expect(status).toContain('inspectMemoryPipeline');

    expect(status).toContain('MEMORY PIPELINE');

    expect(doctor).toContain('inspectMemoryPipeline');

    expect(doctor).toContain('Memory Pipeline');

    expect(mcp).toContain('inspectMemoryPipeline');

    expect(mcp).toContain('materialization');
  });

  it('keeps lifecycle wiring in status (regression)', () => {
    const status = readFileSync(resolve('src/production/status-cli.ts'), 'utf8');

    expect(status).toContain('inspectLifecycleDrift');

    expect(status).toContain("'Lifecycle'");
  });
});

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
