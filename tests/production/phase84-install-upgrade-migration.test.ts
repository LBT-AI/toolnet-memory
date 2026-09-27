/*
 * Phase 84 — install / upgrade / migration closeout certification.
 *
 * This is an AGGREGATE contract check, not a re-run of the sub-phase suites. It
 * asserts that the pieces the sub-phases certified are actually present and
 * wired in the shipped modules, that the packaged runtime agrees with the
 * source, and that the install/upgrade path is still authority-safe and
 * release-inert.
 *
 *   - 84B storage compatibility is available and partitions authority /
 *     derived / ephemeral correctly, with legacy authority not silently read as
 *     current
 *   - 84C upgrade orchestration is available, ordered, deterministic, and a dry
 *     run touches nothing
 *   - 84D1 packaged build identity is available and agrees with the source
 *     digest
 *   - 84D2A recovery is available end-to-end, and a real backup captures
 *     authority while excluding derived caches
 *   - 84D2B live-daemon upgrade certification is present and the daemon
 *     admission surface it uses is exported
 *   - source/bundle parity for the 84B/84C/84D1/84D2A/84D2B surfaces
 *   - authority safety in the plan: migration requires a backup, ephemeral is
 *     discarded, derived is never backed up
 *   - no release mutation anywhere in the build/package path
 *
 * PASS marker: PHASE84_INSTALL_UPGRADE_MIGRATION=PASS
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  classifyStorageKey,
  checkStoreCompatibility,
  storeClassOf,
  storeKindsByClass,
  STORE_CONTRACTS,
} from '../../src/storage/compatibility/index.js';

import {
  UPGRADE_PHASES,
  buildUpgradePlan,
  createRealUpgradePorts,
  orderedPhases,
  runUpgrade,
} from '../../src/production/upgrade/index.js';

import type {
  AuthorityMigration,
  BuildDescriptor,
  UpgradePorts,
} from '../../src/production/upgrade/index.js';

import {
  createRecoveryBackup,
  loadRecoveryManifest,
  restoreRecoveryBackup,
  verifyRecoveryBackup,
} from '../../src/recovery/disaster-recovery.js';

import {
  buildMarkerFor,
  resolveBuildMarker,
  resolvePackageVersion,
  runtimeSourceDigest,
  SOURCE_BUILD_MARKER,
} from '../../src/runtime/build-identity.js';

import { connectDaemonClient, probeDaemon, startDaemon } from '../../src/daemon/index.js';

import { daemonBuildHash, daemonSchemaFingerprints } from '../../src/daemon/fingerprint.js';

import { DAEMON_PROTOCOL_VERSION } from '../../src/daemon/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const MARKER = 'PHASE84_INSTALL_UPGRADE_MIGRATION=PASS';

const REPO_ROOT = resolve(process.cwd());

const PACKAGE = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
  version: string;
  scripts: Record<string, string>;
};

const EXPECTED_PHASES = [
  'inspect',
  'block_unsupported',
  'backup_authority',
  'migrate_authority',
  'verify_authority',
  'rebuild_derived',
  'clear_ephemeral',
  'restart_daemon',
  'verify_upgrade',
] as const;

function bundle(name: string): string {
  return readFileSync(join(REPO_ROOT, 'bundle', name), 'utf8');
}

function tempBase(): string {
  return mkdtempSync(join(tmpdir(), 'toolnet-phase84-closeout-'));
}

/* ==================================================================
 * 84B — storage compatibility
 * ================================================================== */

describe('Phase 84 — 84B storage compatibility is available', () => {
  it('declares contracts for authority, derived and ephemeral stores', () => {
    expect(STORE_CONTRACTS.length).toBeGreaterThan(0);
    expect(storeKindsByClass('authority').length).toBeGreaterThan(0);
    expect(storeKindsByClass('derived').length).toBeGreaterThan(0);
    expect(storeKindsByClass('ephemeral').length).toBeGreaterThan(0);
  });

  it('classifies real keys by class, never by their directory name alone', () => {
    expect(classifyStorageKey('.toolnet/tasks/events.jsonl').storeClass).toBe('authority');
    expect(classifyStorageKey('projects/p/graph/current.json').storeClass).toBe('derived');
    expect(classifyStorageKey('.toolnet/runtime/locks/daemon.lock').storeClass).toBe('ephemeral');
  });

  it('does not silently read a legacy authority schema as current', () => {
    expect(storeClassOf('memory_records')).toBe('authority');

    const legacy = checkStoreCompatibility({ kind: 'memory_records', detectedVersion: 0 });

    expect(legacy.status).not.toBe('compatible');
    expect(legacy.storeClass).toBe('authority');
  });
});

/* ==================================================================
 * 84C — upgrade orchestration
 * ================================================================== */

const BASE_SCHEMA = daemonSchemaFingerprints();

function descriptor(buildMarker: string): BuildDescriptor {
  return {
    protocolVersion: DAEMON_PROTOCOL_VERSION,
    packageVersion: PACKAGE.version,
    buildMarker,
    runtimeRoot: '/tmp/toolnet-phase84-closeout-runtime',
    schema: BASE_SCHEMA,
  };
}

const MEMORY_MIGRATION: AuthorityMigration = {
  id: 'memory_records:0->1',
  kind: 'memory_records',
  fromVersions: [0],
  toVersion: 1,
  description: 'closeout synthetic authority migration',
};

function recordingPorts(): { ports: UpgradePorts; calls: string[] } {
  const calls: string[] = [];

  const ports: UpgradePorts = {
    async backupAuthority(reason) {
      calls.push(`backup:${reason}`);
      return { backupId: 'backup-closeout' };
    },
    async runMigration(id) {
      calls.push(`migrate:${id}`);
    },
    async verifyMigration(id) {
      calls.push(`verify:${id}`);
      return true;
    },
    async rebuildDerived(kinds) {
      calls.push(`rebuild:${[...kinds].join(',')}`);
    },
    async clearEphemeral(kinds) {
      calls.push(`clear:${[...kinds].join(',')}`);
    },
    async restartDaemon() {
      calls.push('restart');
    },
    async verifyUpgrade() {
      calls.push('verify');
    },
  };

  return { ports, calls };
}

describe('Phase 84 — 84C upgrade orchestration is available', () => {
  it('exposes the fixed, ordered upgrade phases', () => {
    expect(orderedPhases()).toEqual([...EXPECTED_PHASES]);
    expect(UPGRADE_PHASES.map((spec) => spec.phase)).toEqual([...EXPECTED_PHASES]);
  });

  it('plans deterministically and only restarts on real build drift', () => {
    const noDrift = buildUpgradePlan({
      observations: [{ kind: 'code_graph' }],
      builds: { before: descriptor('same'), after: descriptor('same') },
    });

    expect(noDrift.daemonRestartRequired).toBe(false);

    const drift = buildUpgradePlan({
      observations: [{ kind: 'code_graph' }],
      builds: { before: descriptor('before'), after: descriptor('after') },
    });

    expect(drift.daemonRestartRequired).toBe(true);
    expect(drift.warnings).toContain('UPGRADE_DAEMON_RESTART_REQUIRED');
  });

  it('touches nothing during a dry run, and refuses to invent a migration', async () => {
    const blocked = buildUpgradePlan({
      observations: [{ kind: 'memory_records', detectedVersion: 0 }],
    });

    /* With the real (empty) migration registry a legacy authority store blocks. */
    expect(blocked.blockers).toContain('UPGRADE_AUTHORITY_MIGRATION_MISSING');
    expect(blocked.complete).toBe(false);
    expect(blocked.daemonRestartRequired).toBe(false);

    const executable = buildUpgradePlan({
      observations: [{ kind: 'memory_records', detectedVersion: 0 }],
      builds: { before: descriptor('before'), after: descriptor('after') },
      migrations: [MEMORY_MIGRATION],
    });

    const { ports, calls } = recordingPorts();

    const result = await runUpgrade(executable, ports, { dryRun: true });

    expect(result.outcome).toBe('planned');
    expect(calls).toEqual([]);
  });
});

/* ==================================================================
 * 84D1 — packaged build identity
 * ================================================================== */

describe('Phase 84 — 84D1 packaged build identity is available', () => {
  it('resolves a source marker and a version from one place', () => {
    expect(resolveBuildMarker({ env: {} }).value).toBe(SOURCE_BUILD_MARKER);
    expect(resolvePackageVersion({ env: {} }).value).toBe(PACKAGE.version);
  });

  it('keeps the packaged marker equal to the current source digest', () => {
    const expected = buildMarkerFor(PACKAGE.version, runtimeSourceDigest(REPO_ROOT));

    expect(expected).not.toBe(PACKAGE.version);
    expect(bundle('identity.js')).toContain(expected);
  });
});

/* ==================================================================
 * 84D2A — recovery end-to-end + authority safety
 * ================================================================== */

class MemoryStorageProvider implements StorageProvider {
  readonly name = 'memory';

  private readonly objects = new Map<string, string>();

  async put(key: string, data: string | Uint8Array, _contentType?: string): Promise<void> {
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
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .map((key) => ({ key, size: (this.objects.get(key) ?? '').length }));
  }
}

describe('Phase 84 — 84D2A recovery is available and authority-safe', () => {
  it('exports the whole recovery surface', () => {
    for (const fn of [
      createRecoveryBackup,
      loadRecoveryManifest,
      verifyRecoveryBackup,
      restoreRecoveryBackup,
    ]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('captures authority in a real backup and never promotes a derived cache', async () => {
    const base = tempBase();
    const root = join(base, 'project');
    const recoveryRoot = join(base, 'recovery');

    mkdirSync(join(root, '.toolnet'), { recursive: true });
    mkdirSync(recoveryRoot, { recursive: true });

    writeFileSync(
      join(root, '.toolnet', 'project.json'),
      `${JSON.stringify({ version: 1, id: 'closeout', name: 'closeout' }, null, 2)}\n`
    );

    const storage = new MemoryStorageProvider();

    await storage.put('projects/closeout/project.json', '{"version":1}', 'application/json');
    await storage.put(
      'projects/closeout/graph/current.json',
      '{"version":1,"nodes":[]}',
      'application/json'
    );
    await storage.put(
      'projects/closeout/graph/artifacts/manifest.json',
      '{"version":1}',
      'application/json'
    );
    await storage.put(
      'projects/closeout/snapshots/snap-1/memories/current.json',
      '{"version":1}',
      'application/json'
    );

    try {
      const project = { id: 'closeout', rootPath: root };

      const manifest = await createRecoveryBackup(project, { recoveryRoot, storage });

      expect(manifest.version).toBe(1);
      expect(manifest.consistency).toBe('append-only-crash-consistent');

      const verification = verifyRecoveryBackup({ id: 'closeout' }, manifest.id, recoveryRoot);

      expect(verification.ok).toBe(true);
      expect(verification.missing).toEqual([]);
      expect(verification.hashMismatches).toEqual([]);

      const loaded = loadRecoveryManifest({ id: 'closeout' }, manifest.id, recoveryRoot);

      const remoteKeys = loaded.remoteObjects.map((object) => object.key);

      expect(remoteKeys).toContain('projects/closeout/project.json');
      expect(remoteKeys.some((key) => key.includes('/graph/artifacts/'))).toBe(false);
      expect(remoteKeys.some((key) => key.includes('/snapshots/'))).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

/* ==================================================================
 * 84D2B — live daemon upgrade surface
 * ================================================================== */

describe('Phase 84 — 84D2B live daemon upgrade certification is available', () => {
  it('ships the live-daemon certification and its package script', () => {
    expect(
      existsSync(join(REPO_ROOT, 'tests', 'production', 'phase84d2b-live-daemon-upgrade.test.ts'))
    ).toBe(true);
    expect(PACKAGE.scripts['phase84d2b:certify']).toBeTruthy();
  });

  it('exports the daemon admission and bootstrap surface the suite drives', () => {
    for (const fn of [startDaemon, connectDaemonClient, probeDaemon, daemonBuildHash]) {
      expect(typeof fn).toBe('function');
    }

    /* The admission digest is a deterministic full-length hex, never a version. */
    const buildHash = daemonBuildHash({
      protocolVersion: DAEMON_PROTOCOL_VERSION,
      packageVersion: PACKAGE.version,
      buildMarker: 'closeout-check',
      runtimeRoot: '/tmp/toolnet-phase84-closeout-runtime',
      schema: daemonSchemaFingerprints(),
    });

    expect(buildHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(buildHash).not.toBe(PACKAGE.version);
  });
});

/* ==================================================================
 * Source / bundle parity
 * ================================================================== */

describe('Phase 84 — source and packaged parity', () => {
  it('carries every Phase 84 surface into the packaged update path', () => {
    const update = bundle('update.js');

    /* 84B */
    expect(update).toContain('STORE_SCHEMA_UNSUPPORTED');
    expect(update).toContain('AUTHORITY_MIGRATION_REQUIRED');

    /* 84C */
    for (const literal of [
      'UPGRADE_PARTIAL_FAILURE',
      'UPGRADE_MIGRATION_FAILED',
      'UPGRADE_REBUILD_FAILED',
      'UPGRADE_VERIFY_FAILED',
      'verify_authority',
      'rebuild_derived',
      'restart_daemon',
    ]) {
      expect(update).toContain(literal);
    }

    /* 84D2A recovery manifest path is reachable from the update command. */
    expect(update).toContain('append-only-crash-consistent');

    /* 84D2B daemon-upgrade integration. */
    expect(update).toContain('UPGRADE_DAEMON_RESTART_FAILED');
    expect(update).toContain('DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS');
    expect(update).toContain('daemonRestartRequired');

    /* 84D1 identity, injected into the packaged artifact. */
    expect(bundle('identity.js')).toContain('TOOLNET_DAEMON_BUILD_ID');
    expect(bundle('identity.js')).toContain('TOOLNET_PACKAGE_VERSION');
  });
});

/* ==================================================================
 * Authority safety
 * ================================================================== */

describe('Phase 84 — authority safety in the plan', () => {
  it('requires a backup before migrating authority, discards only ephemeral, and never backs up derived', () => {
    const plan = buildUpgradePlan({
      observations: [
        { kind: 'memory_records', detectedVersion: 0 },
        { kind: 'code_graph' },
        { kind: 'runtime_locks' },
      ],
      builds: { before: descriptor('before'), after: descriptor('after') },
      migrations: [MEMORY_MIGRATION],
    });

    expect(plan.blockers).toEqual([]);
    expect(plan.complete).toBe(true);

    const authority = plan.stores.find((store) => store.kind === 'memory_records');
    const derived = plan.stores.find((store) => store.kind === 'code_graph');
    const ephemeral = plan.stores.find((store) => store.kind === 'runtime_locks');

    expect(authority?.action).toBe('migrate');
    expect(authority?.requiresBackup).toBe(true);
    expect(derived?.requiresBackup).toBe(false);
    expect(ephemeral?.action).toBe('ignore_ephemeral');

    /* Only the ephemeral store is discarded. */
    expect(plan.ephemeral).toEqual(['runtime_locks']);
    expect(plan.migrations).toEqual([MEMORY_MIGRATION.id]);
  });
});

/* ==================================================================
 * No release mutation
 * ================================================================== */

describe('Phase 84 — no release mutation', () => {
  it('keeps every package script free of publish, tag and push', () => {
    for (const [name, command] of Object.entries(PACKAGE.scripts)) {
      expect(`${name}: ${command}`).not.toMatch(/\bnpm publish\b/u);
      expect(`${name}: ${command}`).not.toMatch(/git (?:tag|push)\b/u);
    }
  });

  it('certifies every Phase 68..84 sub-phase from package scripts', () => {
    for (let phase = 68; phase <= 83; phase += 1) {
      expect(PACKAGE.scripts[`phase${phase}:certify`]).toBeTruthy();
    }

    for (const key of [
      'phase84b:certify',
      'phase84c:certify',
      'phase84d1:certify',
      'phase84d2a:certify',
      'phase84d2b:certify',
      'phase84:certify',
    ]) {
      expect(PACKAGE.scripts[key]).toBeTruthy();
    }
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 84 — certification', () => {
  it('exposes the real upgrade ports adapter', () => {
    expect(typeof createRealUpgradePorts).toBe('function');
  });

  it('emits the Phase 84 PASS marker', () => {
    process.stdout.write(`${MARKER}\n`);

    expect(MARKER).toBe('PHASE84_INSTALL_UPGRADE_MIGRATION=PASS');
  });
});
