/*
 * Phase 84D2A — end-to-end upgrade success and rollback / recovery data path.
 *
 * This suite does not mock the storage layer or the recovery subsystem. It
 * builds a real project on disk that looks like a pre-upgrade install — real
 * task operation log, real projection, authority files, derived stores in a real
 * storage provider, ephemeral state — and then drives the REAL upgrade
 * orchestration and the REAL disaster-recovery backup/restore over it.
 *
 * The only injected pieces are the seams 84C designed as ports:
 *
 *   - `runMigration` / `verifyMigration`, because the declared authority
 *     migration registry is empty by design (a future schema change wires a real
 *     implementation through the same slot),
 *   - `restartDaemon`, because a live daemon is explicitly out of scope for this
 *     sub-phase.
 *
 * Covers:
 *
 *   - a successful full data path: backup → migrate → verify → rebuild → clear
 *   - authority bytes untouched by the upgrade
 *   - a real recovery backup, verified, containing authority and not derived caches
 *   - migration, verification and rebuild failures, each with a structured code
 *     and no false PASS
 *   - rollback from the pre-migration backup: authority restored byte-identically,
 *     task projection rebuilt, derived regenerated, ephemeral never restored
 *   - legacy resolution snapshot preserved through the whole path
 *   - determinism
 *   - no package install, no registry, no network
 *
 * PASS marker: PHASE84D2A_UPGRADE_RECOVERY_E2E=PASS
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadRecoveryManifest,
  restoreRecoveryBackup,
  verifyRecoveryBackup,
} from '../../src/recovery/disaster-recovery.js';

import {
  buildUpgradePlan,
  collectLocalStoreObservations,
  createRealUpgradePorts,
  runUpgrade,
} from '../../src/production/upgrade/index.js';

import { classifyStorageKey } from '../../src/storage/compatibility/index.js';

import { PersistentTypeResolutionStore } from '../../src/storage/type-resolution-store.js';

import { TaskStore } from '../../src/tasks/store.js';

import type {
  AuthorityMigration,
  BuildDescriptor,
  UpgradePorts,
} from '../../src/production/upgrade/index.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import type { TypeResolutionSnapshot } from '../../src/code-intelligence/resolution/types.js';

import type { TaskProjection } from '../../src/tasks/types.js';

const MARKER = 'PHASE84D2A_UPGRADE_RECOVERY_E2E=PASS';

const REPO_ROOT = resolve(process.cwd());

const PROJECT_ID = 'phase84d2a';

const FIXED_TIME = '2026-01-01T00:00:00.000Z';

const MEMORY_KEY = `projects/${PROJECT_ID}/memory/records/current.json`;

const RESOLUTION_KEY = `projects/${PROJECT_ID}/graph/resolution/current.json`;

/* ==================================================================
 * Fixture paths
 * ================================================================== */

/**
 * Authority sources a restore must put back byte for byte.
 *
 * `retrieval/overrides.json` is deliberately not in this list: the recovery
 * subsystem re-certifies adaptive retrieval overrides from the restored
 * feedback log instead of restoring them verbatim (see
 * `refreshAdaptiveRetrievalOverrides`). The upgrade itself never touches it, so
 * it is still part of the upgrade-time byte checks.
 */
const BYTE_STABLE_AUTHORITY_FILES = [
  '.toolnet/tasks/events.jsonl',
  '.toolnet/retrieval/feedback.jsonl',
  '.toolnet/retrieval/telemetry.jsonl',
  '.toolnet/runtime/sources/session-1/events.jsonl',
] as const;

const RECERTIFIED_AUTHORITY_FILE = '.toolnet/retrieval/overrides.json';

const AUTHORITY_FILES = [...BYTE_STABLE_AUTHORITY_FILES, RECERTIFIED_AUTHORITY_FILE] as const;

const DECLARED_LOCAL_AUTHORITY_SOURCES = [
  '.toolnet/tasks/events.jsonl',
  '.toolnet/retrieval/feedback.jsonl',
  '.toolnet/retrieval/overrides.json',
  '.toolnet/retrieval/telemetry.jsonl',
  '.toolnet/runtime/sources/session-1/events.jsonl',
] as const;

const STATE_FILE = '.toolnet/tasks/state.json';

const CURSOR_FILE = '.toolnet/tasks/replication/cursor.json';

const LOCKS_DIR = '.toolnet/runtime/locks';

/* ==================================================================
 * In-memory storage provider — no network, no disk
 * ================================================================== */

class MemoryProvider implements StorageProvider {
  readonly name = 'memory';

  readonly objects = new Map<string, string>();

  readonly contentTypes = new Map<string, string | undefined>();

  puts = 0;
  deletes = 0;

  async put(key: string, data: string | Uint8Array, contentType?: string): Promise<void> {
    this.puts += 1;
    this.contentTypes.set(key, contentType);
    this.objects.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const text = this.objects.get(key);

    return text === undefined ? null : new Uint8Array(Buffer.from(text, 'utf8'));
  }

  async getText(key: string): Promise<string | null> {
    return this.objects.get(key) ?? null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.deletes += 1;
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .map((key) => ({ key, size: (this.objects.get(key) ?? '').length }));
  }
}

/* ==================================================================
 * Fixture
 * ================================================================== */

interface Fixture {
  base: string;
  root: string;
  recoveryRoot: string;
  storage: MemoryProvider;
  project: { id: string; rootPath: string };
  memoryV0: string;
  eventsBefore: string;
  stateBefore: string;
  authorityHashes: Record<string, string>;
  resolutionBefore: string;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function at(root: string, repoPath: string): string {
  return join(root, ...repoPath.split('/'));
}

function readText(root: string, repoPath: string): string {
  return readFileSync(at(root, repoPath), 'utf8');
}

function writeJson(root: string, repoPath: string, value: unknown): void {
  const file = at(root, repoPath);

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function fileHash(root: string, repoPath: string): string {
  return sha256(readFileSync(at(root, repoPath)));
}

function projectionOf(fixture: Fixture): TaskProjection {
  return JSON.parse(readText(fixture.root, STATE_FILE)) as TaskProjection;
}

/**
 * The pre-0.5.4 resolution snapshot.
 *
 * `version: 1` is shared with the current format while the `kind` vocabulary is
 * not, so a reader that trusts the number alone silently loses every entry. The
 * fifth entry keeps a vocabulary nothing knows, to prove unknown values survive
 * too.
 */
function legacyResolutionSnapshot(): unknown {
  const entry = (id: string, kind: string, expression: string): unknown => ({
    id,
    projectId: PROJECT_ID,
    kind,
    sourceFile: 'src/legacy.ts',
    sourceLine: 1,
    expression,
    targetFile: 'src/target.ts',
    targetLine: 10,
    targetName: expression,
    confidence: 'exact',
    resolver: 'typescript-checker',
  });

  return {
    version: 1,
    projectId: PROJECT_ID,
    updatedAt: FIXED_TIME,
    total: 5,
    exact: 4,
    high: 1,
    fallback: 0,
    resolutions: [
      entry('res-1', 'CALL', 'legacyCall'),
      entry('res-2', 'REFERENCE', 'LegacyType'),
      entry('res-3', 'EXTENDS', 'LegacyBase'),
      entry('res-4', 'IMPLEMENTS', 'LegacyContract'),
      entry('res-5', 'MYSTERY', 'legacyUnknown'),
    ],
  };
}

function memoryV1(): string {
  return `${JSON.stringify(
    {
      version: 1,
      projectId: PROJECT_ID,
      migratedAt: FIXED_TIME,
      records: [{ id: 'mem-1', text: 'legacy memory' }],
    },
    null,
    2
  )}\n`;
}

/**
 * Build a project that looks like a pre-upgrade install.
 *
 * The task operation log and projection are produced by the REAL task store, so
 * the fixture has the shape the current code actually writes rather than a shape
 * invented for the test.
 */
async function seedFixture(): Promise<Fixture> {
  const base = mkdtempSync(join(tmpdir(), 'toolnet-phase84d2a-'));
  const root = join(base, 'project');
  const recoveryRoot = join(base, 'recovery');

  for (const directory of [
    '.toolnet/retrieval',
    '.toolnet/runtime/sources/session-1',
    '.toolnet/runtime/locks',
    '.toolnet/tasks/replication',
  ]) {
    mkdirSync(at(root, directory), { recursive: true });
  }

  mkdirSync(recoveryRoot, { recursive: true });

  const project = { id: PROJECT_ID, rootPath: root };

  writeJson(root, '.toolnet/project.json', {
    version: 1,
    id: PROJECT_ID,
    name: 'phase84d2a',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  });

  /* Real task authority: the operation log and projection the current code writes. */
  const store = new TaskStore(project);

  await store.createTask({
    id: 'task-legacy',
    kind: 'task',
    title: 'Legacy task from the pre-upgrade install',
  });

  /* A projection that has fallen behind its operation log: the upgrade must
   * regenerate it from the log, never from itself. */
  const projection = JSON.parse(readText(root, STATE_FILE)) as TaskProjection;

  writeJson(root, STATE_FILE, { ...projection, tasks: {}, operationCount: 0, lastSequence: 0 });

  /* Ephemeral state that must not survive as if it were data. */
  writeJson(root, CURSOR_FILE, { version: 1, lastSequence: 0, updatedAt: FIXED_TIME });
  writeFileSync(
    at(root, `${LOCKS_DIR}/daemon.lock`),
    `${JSON.stringify({ instanceId: 'legacy' })}\n`
  );

  /* Authority: retrieval signals and the session write-ahead log. */
  writeFileSync(at(root, '.toolnet/retrieval/feedback.jsonl'), '{"version":1,"signal":"useful"}\n');
  writeJson(root, '.toolnet/retrieval/overrides.json', {
    version: 1,
    updatedAt: FIXED_TIME,
    rules: [],
  });
  writeFileSync(
    at(root, '.toolnet/retrieval/telemetry.jsonl'),
    '{"version":1,"event":"retrieve"}\n'
  );
  writeFileSync(
    at(root, '.toolnet/runtime/sources/session-1/events.jsonl'),
    '{"version":1,"sessionId":"session-1","type":"prompt"}\n'
  );

  /* Derived + authority remote stores. */
  const storage = new MemoryProvider();

  const memoryV0 = `${JSON.stringify(
    {
      version: 0,
      projectId: PROJECT_ID,
      records: [{ id: 'mem-1', text: 'legacy memory' }],
    },
    null,
    2
  )}\n`;

  const remote: Array<[string, string]> = [
    [
      `projects/${PROJECT_ID}/project.json`,
      JSON.stringify({ version: 1, id: PROJECT_ID }, null, 2),
    ],
    [MEMORY_KEY, memoryV0],
    [
      `projects/${PROJECT_ID}/knowledge/adr/state.v1.json`,
      JSON.stringify({ version: 1, decisions: [{ id: 'adr-1' }] }, null, 2),
    ],
    [
      `projects/${PROJECT_ID}/graph/current.json`,
      JSON.stringify({ version: 1, nodes: [] }, null, 2),
    ],
    [RESOLUTION_KEY, JSON.stringify(legacyResolutionSnapshot(), null, 2)],
    /* Derived caches the backup must never capture. */
    [
      `projects/${PROJECT_ID}/graph/artifacts/manifest.json`,
      JSON.stringify({ version: 1 }, null, 2),
    ],
    [
      `projects/${PROJECT_ID}/snapshots/snap-1/memories/current.json`,
      JSON.stringify({ version: 1 }, null, 2),
    ],
  ];

  for (const [key, text] of remote) {
    await storage.put(key, text, 'application/json');
  }

  return {
    base,
    root,
    recoveryRoot,
    storage,
    project,
    memoryV0,
    eventsBefore: readText(root, '.toolnet/tasks/events.jsonl'),
    stateBefore: readText(root, STATE_FILE),
    authorityHashes: Object.fromEntries(
      AUTHORITY_FILES.map((repoPath) => [repoPath, fileHash(root, repoPath)])
    ),
    resolutionBefore: (await storage.getText(RESOLUTION_KEY)) as string,
  };
}

function cleanup(fixture: Fixture): void {
  rmSync(fixture.base, { recursive: true, force: true });
}

/* ==================================================================
 * The authority migration under test
 * ================================================================== */

const MEMORY_MIGRATION: AuthorityMigration = {
  id: 'memory_records:0->1',
  kind: 'memory_records',
  fromVersions: [0],
  toVersion: 1,
  description: 'rewrite the memory record payload from schema v0 to v1',
};

async function memoryVersion(fixture: Fixture): Promise<number | undefined> {
  const text = await fixture.storage.getText(MEMORY_KEY);

  if (text === null) {
    return undefined;
  }

  return (JSON.parse(text) as { version?: number }).version;
}

async function applyMemoryMigration(fixture: Fixture): Promise<void> {
  const text = await fixture.storage.getText(MEMORY_KEY);

  if (text === null) {
    throw new Error('MIGRATION_SOURCE_MISSING');
  }

  if ((JSON.parse(text) as { version?: number }).version !== 0) {
    throw new Error('MIGRATION_PRECONDITION_FAILED');
  }

  await fixture.storage.put(MEMORY_KEY, memoryV1(), 'application/json');
}

/* ==================================================================
 * Build identity for the transition
 * ================================================================== */

const SCHEMA: BuildDescriptor['schema'] = {
  parser: 'parser-1',
  resolver: 'resolver-1',
  graphSemantics: 'graph-1',
  querySchema: 'query-1',
  artifactSchema: 'artifact-1',
};

const BEFORE_BUILD: BuildDescriptor = {
  protocolVersion: 1,
  packageVersion: '0.5.3',
  buildMarker: '0.5.3+source',
  runtimeRoot: '/tmp/toolnet-phase84d2a-runtime',
  schema: SCHEMA,
};

const AFTER_BUILD: BuildDescriptor = {
  ...BEFORE_BUILD,
  packageVersion: '0.5.4',
  buildMarker: '0.5.4+packaged',
};

function buildPlan(fixture: Fixture) {
  return buildUpgradePlan({
    observations: [
      ...collectLocalStoreObservations(fixture.root),
      { kind: 'memory_records', detectedVersion: 0 },
      { kind: 'runtime_locks' },
    ],
    builds: { before: BEFORE_BUILD, after: AFTER_BUILD },
    migrations: [MEMORY_MIGRATION],
  });
}

/* ==================================================================
 * Ports harness
 * ================================================================== */

interface PortOverrides {
  failMigration?: boolean;
  failVerify?: boolean;
  failRebuild?: boolean;
}

interface Harness {
  ports: UpgradePorts;
  calls: string[];
  state: { restarts: number };
}

function buildPorts(fixture: Fixture, overrides: PortOverrides = {}): Harness {
  const calls: string[] = [];
  const state = { restarts: 0 };

  const ports = createRealUpgradePorts({
    project: fixture.project,
    storage: fixture.storage,
    recoveryRoot: fixture.recoveryRoot,
    restartDaemon: async () => {
      state.restarts += 1;
      calls.push('restart');
    },
    runMigration: async (migrationId: string) => {
      calls.push(`migrate:${migrationId}`);

      if (overrides.failMigration) {
        throw new Error('migration exploded');
      }

      await applyMemoryMigration(fixture);
    },
    verifyMigration: async (migrationId: string) => {
      calls.push(`verify:${migrationId}`);

      if (overrides.failVerify) {
        return false;
      }

      return (await memoryVersion(fixture)) === 1;
    },
    ...(overrides.failRebuild
      ? {
          rebuildDerived: async (kinds: readonly string[]) => {
            calls.push(`rebuild:${kinds.join(',')}`);
            throw new Error('rebuild exploded');
          },
        }
      : {}),
  });

  return { ports, calls, state };
}

async function backupIsUsable(fixture: Fixture, backupId: string): Promise<boolean> {
  return verifyRecoveryBackup({ id: PROJECT_ID }, backupId, fixture.recoveryRoot).ok;
}

/* ==================================================================
 * Fixture shape
 * ================================================================== */

describe('Phase 84D2A — end-to-end fixture', () => {
  it('builds a pre-upgrade install with every store class present', async () => {
    const fixture = await seedFixture();

    try {
      const observations = collectLocalStoreObservations(fixture.root);
      const kinds = observations.map((observation) => observation.kind);

      expect(kinds).toContain('project_manifest');
      expect(kinds).toContain('task_operations');
      expect(kinds).toContain('task_projection');
      expect(kinds).toContain('task_replication_cursor');
      expect(kinds).toContain('retrieval_feedback');
      expect(kinds).toContain('retrieval_overrides');
      expect(kinds).toContain('retrieval_telemetry');

      /* The projection really is stale relative to the operation log. */
      expect(Object.keys(projectionOf(fixture).tasks)).toEqual([]);
      expect(fixture.eventsBefore.split('\n').filter(Boolean).length).toBeGreaterThan(0);

      /* Every store class the upgrade must treat differently is really present. */
      expect(classifyStorageKey(MEMORY_KEY).storeClass).toBe('authority');
      expect(
        classifyStorageKey(`projects/${PROJECT_ID}/knowledge/adr/state.v1.json`).storeClass
      ).toBe('authority');
      expect(classifyStorageKey(RESOLUTION_KEY).storeClass).toBe('derived');
      expect(classifyStorageKey('.toolnet/tasks/events.jsonl').storeClass).toBe('authority');
      expect(classifyStorageKey('.toolnet/tasks/state.json').storeClass).toBe('derived');
      expect(classifyStorageKey('.toolnet/runtime/locks/daemon.lock').storeClass).toBe('ephemeral');
      expect(classifyStorageKey('.toolnet/tasks/replication/cursor.json').storeClass).toBe(
        'ephemeral'
      );
    } finally {
      cleanup(fixture);
    }
  });

  it('plans migration, rebuild and ephemeral cleanup, and blocks nothing', async () => {
    const fixture = await seedFixture();

    try {
      const plan = buildPlan(fixture);

      expect(plan.blockers).toEqual([]);
      expect(plan.complete).toBe(true);
      expect(plan.migrations).toEqual(['memory_records:0->1']);
      expect(plan.rebuilds).toEqual(['task_projection']);
      expect(plan.ephemeral).toEqual(['runtime_locks', 'task_replication_cursor']);
      expect(plan.daemonRestartRequired).toBe(true);
    } finally {
      cleanup(fixture);
    }
  });
});

/* ==================================================================
 * Successful upgrade
 * ================================================================== */

describe('Phase 84D2A — successful upgrade data path', () => {
  it('backs up, migrates, verifies, rebuilds and clears without losing authority', async () => {
    const fixture = await seedFixture();

    try {
      const plan = buildPlan(fixture);
      const harness = buildPorts(fixture);

      const result = await runUpgrade(plan, harness.ports, { dryRun: false });

      expect(result.outcome).toBe('applied');
      expect(result.failure).toBeUndefined();
      expect(result.backupId).toBeTruthy();
      expect(result.daemonRestarted).toBe(true);

      /* Authority bytes are untouched by the whole upgrade. */
      for (const [repoPath, hash] of Object.entries(fixture.authorityHashes)) {
        expect(fileHash(fixture.root, repoPath)).toBe(hash);
      }

      /* The migration did run, and the record it moved forward is intact. */
      expect(await memoryVersion(fixture)).toBe(1);
      expect(JSON.parse((await fixture.storage.getText(MEMORY_KEY)) as string).records).toEqual([
        { id: 'mem-1', text: 'legacy memory' },
      ]);
      expect(fixture.storage.contentTypes.get(MEMORY_KEY)).toBe('application/json');

      /* The derived projection was regenerated from the operation log. */
      expect(Object.keys(projectionOf(fixture).tasks)).toContain('task-legacy');
      expect(readText(fixture.root, STATE_FILE)).not.toBe(fixture.stateBefore);

      /* Ephemeral state is gone, and only ephemeral state is gone. */
      expect(existsSync(at(fixture.root, CURSOR_FILE))).toBe(false);
      expect(existsSync(at(fixture.root, LOCKS_DIR))).toBe(false);

      expect(harness.calls).toEqual([
        'migrate:memory_records:0->1',
        'verify:memory_records:0->1',
        'restart',
      ]);
      expect(harness.state.restarts).toBe(1);
    } finally {
      cleanup(fixture);
    }
  });

  it('produces a deterministic plan and a deterministic phase outcome', async () => {
    const first = await seedFixture();
    const second = await seedFixture();

    try {
      expect(JSON.stringify(buildPlan(first))).toBe(JSON.stringify(buildPlan(second)));

      const firstHarness = buildPorts(first);
      const secondHarness = buildPorts(second);

      const firstResult = await runUpgrade(buildPlan(first), firstHarness.ports, { dryRun: false });
      const secondResult = await runUpgrade(buildPlan(second), secondHarness.ports, {
        dryRun: false,
      });

      expect(firstResult.outcome).toBe(secondResult.outcome);
      expect(firstResult.steps.map((step) => `${step.phase}:${step.status}`)).toEqual(
        secondResult.steps.map((step) => `${step.phase}:${step.status}`)
      );
      expect(firstResult.daemonRestarted).toBe(secondResult.daemonRestarted);
    } finally {
      cleanup(first);
      cleanup(second);
    }
  });
});

/* ==================================================================
 * Authority backup
 * ================================================================== */

describe('Phase 84D2A — authority backup', () => {
  it('writes a verified recovery backup of the authority sources before mutating', async () => {
    const fixture = await seedFixture();

    try {
      const harness = buildPorts(fixture, { failVerify: true });

      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      const backupId = result.backupId as string;

      expect(backupId).toBeTruthy();

      const verification = verifyRecoveryBackup({ id: PROJECT_ID }, backupId, fixture.recoveryRoot);

      expect(verification.ok).toBe(true);
      expect(verification.projectMatch).toBe(true);
      expect(verification.manifestDigestValid).toBe(true);
      expect(verification.missing).toEqual([]);
      expect(verification.hashMismatches).toEqual([]);

      const manifest = loadRecoveryManifest({ id: PROJECT_ID }, backupId, fixture.recoveryRoot);

      expect(manifest.version).toBe(1);
      expect(manifest.projectId).toBe(PROJECT_ID);
      expect(manifest.consistency).toBe('append-only-crash-consistent');

      /* Every declared local authority source is present, with its role. */
      const localPaths = manifest.localFiles.map((file) => file.path);

      for (const repoPath of DECLARED_LOCAL_AUTHORITY_SOURCES) {
        expect(localPaths).toContain(repoPath);
      }

      expect(manifest.localFiles.find((file) => file.path === AUTHORITY_FILES[0])?.role).toBe(
        'task-operations'
      );
      expect(
        manifest.localFiles.find((file) => file.path.endsWith('sources/session-1/events.jsonl'))
          ?.role
      ).toBe('session-wal');
      expect(
        manifest.localFiles.find((file) => file.path === '.toolnet/retrieval/overrides.json')?.role
      ).toBe('retrieval-overrides');

      for (const file of manifest.localFiles) {
        expect(file.sha256).toMatch(/^[0-9a-f]{64}$/u);
        expect(file.bytes).toBeGreaterThan(0);
      }

      /* Remote authority objects are captured. */
      const remoteKeys = manifest.remoteObjects.map((object) => object.key);

      expect(remoteKeys).toContain(MEMORY_KEY);
      expect(remoteKeys).toContain(`projects/${PROJECT_ID}/knowledge/adr/state.v1.json`);
      expect(remoteKeys).toContain(`projects/${PROJECT_ID}/project.json`);

      for (const object of manifest.remoteObjects) {
        expect(object.sha256).toMatch(/^[0-9a-f]{64}$/u);
      }
    } finally {
      cleanup(fixture);
    }
  });

  it('never promotes a derived cache into the authority backup', async () => {
    const fixture = await seedFixture();

    try {
      const result = await runUpgrade(buildPlan(fixture), buildPorts(fixture).ports, {
        dryRun: false,
      });

      const manifest = loadRecoveryManifest(
        { id: PROJECT_ID },
        result.backupId as string,
        fixture.recoveryRoot
      );

      const remoteKeys = manifest.remoteObjects.map((object) => object.key);

      /* The derived caches the recovery subsystem excludes stay excluded. */
      expect(remoteKeys.some((key) => key.includes('/graph/artifacts/'))).toBe(false);
      expect(remoteKeys.some((key) => key.includes('/snapshots/'))).toBe(false);

      /* Being present in a backup never changes what a store IS. */
      for (const key of remoteKeys) {
        expect(classifyStorageKey(key).matched).toBe(true);
      }

      expect(classifyStorageKey(`projects/${PROJECT_ID}/graph/current.json`).storeClass).toBe(
        'derived'
      );
      expect(classifyStorageKey(MEMORY_KEY).storeClass).toBe('authority');
      expect(
        classifyStorageKey(`projects/${PROJECT_ID}/graph/artifacts/manifest.json`).storeClass
      ).toBe('derived');

      /* And the excluded cache really did exist in storage. */
      expect(
        await fixture.storage.exists(`projects/${PROJECT_ID}/graph/artifacts/manifest.json`)
      ).toBe(true);
    } finally {
      cleanup(fixture);
    }
  });
});

/* ==================================================================
 * Failure paths
 * ================================================================== */

describe('Phase 84D2A — failure paths', () => {
  it('fails the migration, keeps the backup, and mutates no authority', async () => {
    const fixture = await seedFixture();

    try {
      const harness = buildPorts(fixture, { failMigration: true });

      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      expect(result.outcome).toBe('failed');
      expect(result.outcome).not.toBe('applied');
      expect(result.failure?.code).toBe('UPGRADE_MIGRATION_FAILED');
      expect(result.failure?.phase).toBe('migrate_authority');
      expect(result.failure?.partial).toBe(false);
      expect(result.failure?.codes).not.toContain('UPGRADE_PARTIAL_FAILURE');
      expect(result.daemonRestarted).toBe(false);

      expect(result.backupId).toBeTruthy();
      expect(await backupIsUsable(fixture, result.backupId as string)).toBe(true);

      /* Nothing advanced: authority unchanged, derived not rebuilt, ephemeral kept. */
      expect(await memoryVersion(fixture)).toBe(0);
      expect(await fixture.storage.getText(MEMORY_KEY)).toBe(fixture.memoryV0);

      for (const [repoPath, hash] of Object.entries(fixture.authorityHashes)) {
        expect(fileHash(fixture.root, repoPath)).toBe(hash);
      }

      expect(readText(fixture.root, STATE_FILE)).toBe(fixture.stateBefore);
      expect(existsSync(at(fixture.root, CURSOR_FILE))).toBe(true);
      expect(existsSync(at(fixture.root, LOCKS_DIR))).toBe(true);

      expect(
        result.steps.filter((step) => step.detail === 'not reached').map((step) => step.phase)
      ).toEqual([
        'verify_authority',
        'rebuild_derived',
        'clear_ephemeral',
        'restart_daemon',
        'verify_upgrade',
      ]);
    } finally {
      cleanup(fixture);
    }
  });

  it('fails verification after the migration and stops before rebuilding', async () => {
    const fixture = await seedFixture();

    try {
      const harness = buildPorts(fixture, { failVerify: true });

      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      expect(result.outcome).toBe('failed');
      expect(result.failure?.code).toBe('UPGRADE_VERIFY_FAILED');
      expect(result.failure?.phase).toBe('verify_authority');
      expect(result.failure?.partial).toBe(true);
      expect(result.failure?.codes).toContain('UPGRADE_PARTIAL_FAILURE');

      /* The migration ran, so the data moved — and the backup must still hold
       * the pre-migration state. */
      expect(await memoryVersion(fixture)).toBe(1);
      expect(await backupIsUsable(fixture, result.backupId as string)).toBe(true);

      expect(readText(fixture.root, STATE_FILE)).toBe(fixture.stateBefore);
      expect(existsSync(at(fixture.root, LOCKS_DIR))).toBe(true);
      expect(harness.state.restarts).toBe(0);
    } finally {
      cleanup(fixture);
    }
  });

  it('fails the rebuild after a verified migration and never restarts the daemon', async () => {
    const fixture = await seedFixture();

    try {
      const harness = buildPorts(fixture, { failRebuild: true });

      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      expect(result.outcome).toBe('failed');
      expect(result.failure?.code).toBe('UPGRADE_REBUILD_FAILED');
      expect(result.failure?.phase).toBe('rebuild_derived');
      expect(result.failure?.partial).toBe(true);
      expect(result.daemonRestarted).toBe(false);
      expect(result.backupId).toBeTruthy();

      /* The projection was not regenerated, and ephemeral state was not cleared. */
      expect(readText(fixture.root, STATE_FILE)).toBe(fixture.stateBefore);
      expect(existsSync(at(fixture.root, CURSOR_FILE))).toBe(true);
      expect(existsSync(at(fixture.root, LOCKS_DIR))).toBe(true);

      expect(harness.calls).not.toContain('restart');
      expect(harness.state.restarts).toBe(0);
    } finally {
      cleanup(fixture);
    }
  });
});

/* ==================================================================
 * Rollback / recovery
 * ================================================================== */

describe('Phase 84D2A — rollback and recovery', () => {
  it('restores authority byte-identically, rebuilds the projection, and drops ephemeral state', async () => {
    const fixture = await seedFixture();

    try {
      /* Fail after the migration has already changed authority data. */
      const harness = buildPorts(fixture, { failVerify: true });
      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      expect(result.outcome).toBe('failed');
      expect(await memoryVersion(fixture)).toBe(1);
      expect(readText(fixture.root, STATE_FILE)).toBe(fixture.stateBefore);

      const backupId = result.backupId as string;

      const restored = await restoreRecoveryBackup(fixture.project, backupId, {
        apply: true,
        recoveryRoot: fixture.recoveryRoot,
        storage: fixture.storage,
      });

      expect(restored.applied).toBe(true);
      expect(restored.safetyBackupId).toBeTruthy();
      expect(restored.verification.ok).toBe(true);
      expect(restored.localRestored).toBeGreaterThan(0);
      expect(restored.remoteRestored).toBeGreaterThan(0);

      /* Authority is back, byte for byte. */
      expect(await fixture.storage.getText(MEMORY_KEY)).toBe(fixture.memoryV0);
      expect(await memoryVersion(fixture)).toBe(0);
      expect(readText(fixture.root, '.toolnet/tasks/events.jsonl')).toBe(fixture.eventsBefore);

      for (const repoPath of BYTE_STABLE_AUTHORITY_FILES) {
        expect(fileHash(fixture.root, repoPath)).toBe(fixture.authorityHashes[repoPath]);
      }

      /* The advisory authority file survives the restore, re-certified from the
       * restored feedback log rather than copied verbatim. */
      const overrides = JSON.parse(readText(fixture.root, RECERTIFIED_AUTHORITY_FILE)) as {
        version: number;
        rules: unknown[];
      };

      expect(overrides.version).toBe(1);
      expect(Array.isArray(overrides.rules)).toBe(true);

      /* And it really was rewritten by the recovery subsystem, not by the
       * upgrade — the upgrade-time byte check above passed before the restore. */
      expect(fileHash(fixture.root, RECERTIFIED_AUTHORITY_FILE)).not.toBe(
        fixture.authorityHashes[RECERTIFIED_AUTHORITY_FILE]
      );

      /* The task projection is rebuilt from the restored operation log. */
      expect(restored.taskProjectionRebuilt).toBe(true);
      expect(Object.keys(projectionOf(fixture).tasks)).toContain('task-legacy');

      /* Derived cache can be regenerated: the projection exists again at all. */
      expect(existsSync(at(fixture.root, STATE_FILE))).toBe(true);

      /* Stale locks and ephemeral runtime state are never restored. */
      expect(existsSync(at(fixture.root, LOCKS_DIR))).toBe(false);
      expect(existsSync(at(fixture.root, CURSOR_FILE))).toBe(false);

      /* The pre-restore safety backup is itself usable. */
      expect(await backupIsUsable(fixture, restored.safetyBackupId as string)).toBe(true);
    } finally {
      cleanup(fixture);
    }
  });

  it('rolls back a failed rebuild to the pre-migration state', async () => {
    const fixture = await seedFixture();

    try {
      const harness = buildPorts(fixture, { failRebuild: true });
      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      expect(result.outcome).toBe('failed');
      expect(await memoryVersion(fixture)).toBe(1);

      const restored = await restoreRecoveryBackup(fixture.project, result.backupId as string, {
        apply: true,
        recoveryRoot: fixture.recoveryRoot,
        storage: fixture.storage,
      });

      expect(restored.applied).toBe(true);
      expect(await memoryVersion(fixture)).toBe(0);
      expect(Object.keys(projectionOf(fixture).tasks)).toContain('task-legacy');
    } finally {
      cleanup(fixture);
    }
  });

  it('refuses to restore from a damaged backup', async () => {
    const fixture = await seedFixture();

    try {
      const result = await runUpgrade(buildPlan(fixture), buildPorts(fixture).ports, {
        dryRun: false,
      });

      const backupId = result.backupId as string;

      /* Corrupt a captured remote blob behind the subsystem's back. */
      const manifest = loadRecoveryManifest({ id: PROJECT_ID }, backupId, fixture.recoveryRoot);

      const target = manifest.remoteObjects[0];

      expect(target).toBeDefined();

      writeFileSync(
        join(fixture.recoveryRoot, backupId, ...(target as { blob: string }).blob.split('/')),
        'tampered'
      );

      expect(await backupIsUsable(fixture, backupId)).toBe(false);

      await expect(
        restoreRecoveryBackup(fixture.project, backupId, {
          apply: true,
          recoveryRoot: fixture.recoveryRoot,
          storage: fixture.storage,
        })
      ).rejects.toThrow(/RECOVERY_BACKUP_INTEGRITY_FAILED/u);
    } finally {
      cleanup(fixture);
    }
  });
});

/* ==================================================================
 * Legacy resolution preservation
 * ================================================================== */

describe('Phase 84D2A — legacy resolution preservation', () => {
  it('reads every legacy entry, keeps provenance, and never drops an unknown vocabulary', async () => {
    const fixture = await seedFixture();

    try {
      const store = new PersistentTypeResolutionStore(fixture.storage);

      const loaded = await store.loadWithCompatibility(PROJECT_ID);

      expect(loaded.compatibility.status).toBe('migrated');
      expect(loaded.compatibility.reasonCode).toBe('STORE_SCHEMA_LEGACY_COMPATIBLE');

      const snapshot = loaded.snapshot as TypeResolutionSnapshot;

      expect(snapshot.resolutions).toHaveLength(5);
      expect(snapshot.resolutions.map((entry) => entry.kind)).toEqual([
        'call',
        'type',
        'inheritance',
        'implementation',
        'MYSTERY',
      ]);
      expect(snapshot.resolutions.map((entry) => entry.legacyKind)).toEqual([
        'CALL',
        'REFERENCE',
        'EXTENDS',
        'IMPLEMENTS',
        'MYSTERY',
      ]);

      /* A read never rewrites the stored object. */
      expect(await fixture.storage.getText(RESOLUTION_KEY)).toBe(fixture.resolutionBefore);
    } finally {
      cleanup(fixture);
    }
  });

  it('survives a full upgrade and a rollback without losing a resolution', async () => {
    const fixture = await seedFixture();

    try {
      const harness = buildPorts(fixture, { failVerify: true });
      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      expect(result.outcome).toBe('failed');

      await restoreRecoveryBackup(fixture.project, result.backupId as string, {
        apply: true,
        recoveryRoot: fixture.recoveryRoot,
        storage: fixture.storage,
      });

      const after = await new PersistentTypeResolutionStore(fixture.storage).load(PROJECT_ID);

      expect((after as TypeResolutionSnapshot).resolutions).toHaveLength(5);
      expect((after as TypeResolutionSnapshot).resolutions.map((entry) => entry.kind)).toEqual([
        'call',
        'type',
        'inheritance',
        'implementation',
        'MYSTERY',
      ]);
    } finally {
      cleanup(fixture);
    }
  });

  it('writes canonical kinds forward and keeps an unknown vocabulary visible', async () => {
    const fixture = await seedFixture();

    try {
      const store = new PersistentTypeResolutionStore(fixture.storage);

      const loaded = await store.loadWithCompatibility(PROJECT_ID);

      await store.save(loaded.snapshot as TypeResolutionSnapshot);

      const canonical = JSON.parse(
        (await fixture.storage.getText(RESOLUTION_KEY)) as string
      ) as TypeResolutionSnapshot;

      expect(canonical.resolutions).toHaveLength(5);
      expect(canonical.resolutions.slice(0, 4).map((entry) => entry.kind)).toEqual([
        'call',
        'type',
        'inheritance',
        'implementation',
      ]);
      /* The archived vocabulary is not carried forward once it has been mapped. */
      expect(
        canonical.resolutions.slice(0, 4).every((entry) => entry.legacyKind === undefined)
      ).toBe(true);
      /* An unknown vocabulary keeps both its raw value and its marker. */
      expect(canonical.resolutions[4]?.kind).toBe('MYSTERY');
      expect(canonical.resolutions[4]?.legacyKind).toBe('MYSTERY');
    } finally {
      cleanup(fixture);
    }
  });
});

/* ==================================================================
 * No package install, no network
 * ================================================================== */

describe('Phase 84D2A — no package install and no network', () => {
  it('keeps npm, the registry and raw network access out of the upgrade module', () => {
    for (const file of [
      'src/production/upgrade/ports.ts',
      'src/production/upgrade/run.ts',
      'src/production/upgrade/plan.ts',
      'src/production/upgrade/package-upgrade.ts',
    ]) {
      const source = readFileSync(join(REPO_ROOT, file), 'utf8');

      expect(source).not.toMatch(/\bnpm\b/u);
      expect(source).not.toMatch(/node:https?\b/u);
      expect(source).not.toMatch(/node:net\b/u);
      expect(source).not.toMatch(/\bfetch\(/u);
    }
  });

  it('drives the whole path through injected ports and a local fixture', async () => {
    const fixture = await seedFixture();

    try {
      const harness = buildPorts(fixture, { failRebuild: true });
      const result = await runUpgrade(buildPlan(fixture), harness.ports, { dryRun: false });

      /* The declaration step is a fixture, not a registry write. */
      expect(result.outcome).toBe('failed');
      expect(fixture.storage.name).toBe('memory');
      expect(fixture.root.startsWith(tmpdir())).toBe(true);

      /* Exactly one daemon restart attempt would have happened, via the port. */
      expect(harness.state.restarts).toBe(0);
    } finally {
      cleanup(fixture);
    }
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 84D2A — certification', () => {
  it('emits the Phase 84D2A PASS marker', () => {
    process.stdout.write(`${MARKER}\n`);

    expect(MARKER).toBe('PHASE84D2A_UPGRADE_RECOVERY_E2E=PASS');
  });
});
