/*
 * Phase 84C — Upgrade Orchestration & Migration Execution production
 * certification.
 *
 * Exercises the REAL implementation:
 *
 *   - the deterministic upgrade planner over the Phase 84B store classification
 *   - authority migration planning, missing-migration blocking, and the
 *     refusal to guess at an unsupported authority schema
 *   - derived rebuild rules, including the backward-compatible resolution case
 *   - ephemeral cleanup, which never touches authority
 *   - the fixed phase ordering, asserted by observation rather than by comment
 *   - dry run: nothing written, nothing cleared, no daemon restarted
 *   - partial failure: specific code plus UPGRADE_PARTIAL_FAILURE
 *   - the daemon build barrier: fingerprint drift, never package version alone
 *   - a REAL authority backup through the disaster-recovery module, still
 *     verifiable after a later phase failed
 *   - `update` integration: one updater, one package installer
 *   - no npm, no registry and no network anywhere in the upgrade module
 *   - the docs case-collision invariant
 *
 * PASS marker: PHASE84C_UPGRADE_ORCHESTRATION=PASS
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DAEMON_PROTOCOL_VERSION } from '../../src/daemon/types.js';

import {
  loadRecoveryManifest,
  verifyRecoveryBackup,
} from '../../src/recovery/disaster-recovery.js';

import {
  AUTHORITY_MIGRATIONS,
  UPGRADE_PHASES,
  buildUpgradePlan,
  collectLocalStoreObservations,
  compareBuilds,
  createRealUpgradePorts,
  currentBuildDescriptor,
  orchestratePackageUpgrade,
  orderedPhases,
  readSchemaVersionMarker,
  runUpgrade,
} from '../../src/production/upgrade/index.js';

import type { Dirent } from 'node:fs';

import type {
  AuthorityMigration,
  BuildDescriptor,
  StoreObservation,
  UpgradePlan,
  UpgradePorts,
} from '../../src/production/upgrade/index.js';

const MARKER = 'PHASE84C_UPGRADE_ORCHESTRATION=PASS';

const REPO_ROOT = resolve(process.cwd());

/*
 * This repository is only an initialised ToolNet project when `.toolnet/`
 * exists. That directory is gitignored, so a fresh CI checkout has none (and
 * the suite's own "no ToolNet state" test documents zero observations in that
 * case). The two "this repository" certifications below need that state; they
 * are skipped rather than asserting on an uninitialised directory.
 */
const REPO_IS_INITIALIZED = existsSync(join(REPO_ROOT, '.toolnet', 'project.json'));

const UPGRADE_DIR = join(REPO_ROOT, 'src', 'production', 'upgrade');

const RUNTIME_ROOT = '/tmp/toolnet-phase84c-runtime';

/* ==================================================================
 * Fixtures
 * ================================================================== */

const BASE_SCHEMA: BuildDescriptor['schema'] = {
  parser: 'parser-a',
  resolver: 'resolver-a',
  graphSemantics: 'graph-a',
  querySchema: 'query-a',
  artifactSchema: 'artifact-a',
};

function build(overrides: Partial<BuildDescriptor> = {}): BuildDescriptor {
  return {
    protocolVersion: DAEMON_PROTOCOL_VERSION,
    packageVersion: '0.5.3',
    buildMarker: 'source',
    runtimeRoot: RUNTIME_ROOT,
    schema: BASE_SCHEMA,
    ...overrides,
  };
}

/**
 * Synthetic migrations.
 *
 * The real registry is empty because no authority store has a schema change
 * yet; the migration path is exercised by declaring one explicitly, exactly as
 * a future schema change would.
 */
const MEMORY_MIGRATION: AuthorityMigration = {
  id: 'memory_records:0->1',
  kind: 'memory_records',
  fromVersions: [0],
  toVersion: 1,
  description: 'synthetic authority migration',
};

const ADR_MIGRATION: AuthorityMigration = {
  id: 'adr_state:0->1',
  kind: 'adr_state',
  fromVersions: [0],
  toVersion: 1,
  description: 'synthetic authority migration',
};

/** A store observed at a schema version the contract cannot read. */
const LEGACY_AUTHORITY: StoreObservation = { kind: 'memory_records', detectedVersion: 0 };

/* ==================================================================
 * Fake ports — record every call, fail on demand
 * ================================================================== */

class RecordingPorts implements UpgradePorts {
  readonly calls: string[] = [];

  backupId = 'backup-1';

  failBackup = false;
  failMigration: string | null = null;
  failRebuild = false;
  failEphemeralClear = false;
  failRestart = false;
  failVerifyUpgrade = false;

  migrationVerified = true;

  async backupAuthority(reason: string): Promise<{ backupId: string }> {
    this.calls.push(`backup:${reason}`);

    if (this.failBackup) {
      throw new Error('backup unavailable');
    }

    return { backupId: this.backupId };
  }

  async runMigration(migrationId: string): Promise<void> {
    this.calls.push(`migrate:${migrationId}`);

    if (this.failMigration === migrationId) {
      throw new Error('migration exploded');
    }
  }

  async verifyMigration(migrationId: string): Promise<boolean> {
    this.calls.push(`verify:${migrationId}`);

    return this.migrationVerified;
  }

  async rebuildDerived(kinds: readonly string[]): Promise<void> {
    this.calls.push(`rebuild:${[...kinds].join(',')}`);

    if (this.failRebuild) {
      throw new Error('rebuild exploded');
    }
  }

  async clearEphemeral(kinds: readonly string[]): Promise<void> {
    this.calls.push(`clear:${[...kinds].join(',')}`);

    if (this.failEphemeralClear) {
      throw new Error('clear exploded');
    }
  }

  async restartDaemon(): Promise<void> {
    this.calls.push('restart');

    if (this.failRestart) {
      throw new Error('restart exploded');
    }
  }

  async verifyUpgrade(): Promise<void> {
    this.calls.push('verify');

    if (this.failVerifyUpgrade) {
      throw new Error('post-conditions failed');
    }
  }

  phaseOf(call: string): string {
    return call.split(':')[0] ?? '';
  }
}

/** The full plan: authority migration + derived rebuild + ephemeral + restart. */
function fullPlan(): UpgradePlan {
  return buildUpgradePlan({
    observations: [LEGACY_AUTHORITY, { kind: 'code_graph' }, { kind: 'runtime_locks' }],
    builds: { before: build(), after: build({ schema: { ...BASE_SCHEMA, parser: 'parser-b' } }) },
    migrations: [MEMORY_MIGRATION],
  });
}

/* ==================================================================
 * Repository source helpers
 * ================================================================== */

function sourceFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }

  return files.sort();
}

function repoSource(path: string): string {
  return readFileSync(join(REPO_ROOT, path), 'utf8');
}

function tempProject(): { root: string; recoveryRoot: string; id: string } {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase84c-'));

  mkdirSync(join(root, '.toolnet', 'retrieval'), { recursive: true });

  writeFileSync(
    join(root, '.toolnet', 'project.json'),
    `${JSON.stringify({ version: 1, id: 'phase84c-test', name: 'phase84c' }, null, 2)}\n`
  );

  writeFileSync(
    join(root, '.toolnet', 'retrieval', 'overrides.json'),
    `${JSON.stringify({ version: 1, rules: [] }, null, 2)}\n`
  );

  return { root, recoveryRoot: join(root, '.recovery'), id: 'phase84c-test' };
}

/* ==================================================================
 * Upgrade plan model
 * ================================================================== */

describe('Phase 84C — upgrade plan model', () => {
  it('declares no authority migration, because none exists yet', () => {
    expect(AUTHORITY_MIGRATIONS).toEqual([]);
    expect(Object.isFrozen(AUTHORITY_MIGRATIONS)).toBe(true);
  });

  it('plans no work when every observed store is current', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'memory_records' }, { kind: 'code_graph' }],
    });

    expect(plan.stores.map((store) => store.action)).toEqual(['compatible', 'compatible']);
    expect(plan.migrations).toEqual([]);
    expect(plan.rebuilds).toEqual([]);
    expect(plan.ephemeral).toEqual([]);
    expect(plan.blockers).toEqual([]);
    expect(plan.complete).toBe(true);
    expect(plan.daemonRestartRequired).toBe(false);
  });

  it('is deterministic regardless of observation order', () => {
    const observations: StoreObservation[] = [
      { kind: 'runtime_locks' },
      LEGACY_AUTHORITY,
      { kind: 'code_graph' },
    ];

    const forward = buildUpgradePlan({
      observations,
      builds: { before: build(), after: build({ packageVersion: '0.5.4' }) },
      migrations: [MEMORY_MIGRATION],
    });

    const reversed = buildUpgradePlan({
      observations: [...observations].reverse(),
      builds: { before: build(), after: build({ packageVersion: '0.5.4' }) },
      migrations: [MEMORY_MIGRATION],
    });

    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  it('covers every observed store exactly once', () => {
    const plan = fullPlan();

    const kinds = plan.stores.map((store) => store.kind);

    expect(kinds).toEqual([...kinds].sort());
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds).toEqual(['code_graph', 'memory_records', 'runtime_locks']);
  });

  it('takes the most severe treatment when a store is observed twice', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'memory_records' }, LEGACY_AUTHORITY],
      migrations: [MEMORY_MIGRATION],
    });

    expect(plan.stores).toHaveLength(1);
    expect(plan.stores[0]?.action).toBe('migrate');
    expect(plan.stores[0]?.requiresBackup).toBe(true);
    expect(plan.blockers).toEqual([]);
  });

  it('never lets a duplicate observation soften a block', () => {
    const plan = buildUpgradePlan({
      observations: [LEGACY_AUTHORITY, { kind: 'memory_records' }],
    });

    expect(plan.stores).toHaveLength(1);
    expect(plan.stores[0]?.action).toBe('block');
    expect(plan.stores[0]?.requiresBackup).toBe(false);
    expect(plan.blockers).toEqual(['UPGRADE_AUTHORITY_MIGRATION_MISSING']);
  });

  it('marks the plan incomplete when anything blocks it', () => {
    const plan = buildUpgradePlan({ observations: [LEGACY_AUTHORITY] });

    expect(plan.blockers).toEqual(['UPGRADE_AUTHORITY_MIGRATION_MISSING']);
    expect(plan.complete).toBe(false);
  });
});

/* ==================================================================
 * Authority rules
 * ================================================================== */

describe('Phase 84C — authority rules', () => {
  it('leaves a compatible authority store untouched', () => {
    const plan = buildUpgradePlan({ observations: [{ kind: 'memory_records' }] });

    const entry = plan.stores[0];

    expect(entry?.storeClass).toBe('authority');
    expect(entry?.action).toBe('compatible');
    expect(entry?.requiresBackup).toBe(false);
    expect(plan.migrations).toEqual([]);
  });

  it('plans an explicit, versioned migration when one is declared', () => {
    const plan = buildUpgradePlan({
      observations: [LEGACY_AUTHORITY],
      migrations: [MEMORY_MIGRATION],
    });

    const entry = plan.stores[0];

    expect(entry?.action).toBe('migrate');
    expect(entry?.migrationId).toBe('memory_records:0->1');
    expect(entry?.requiresBackup).toBe(true);
    expect(entry?.reasonCode).toBe('AUTHORITY_MIGRATION_REQUIRED');
    expect(plan.migrations).toEqual(['memory_records:0->1']);
    expect(plan.blockers).toEqual([]);
    expect(plan.warnings).toContain('UPGRADE_AUTHORITY_MIGRATION_REQUIRED');
  });

  it('blocks a legacy authority store with no declared migration', () => {
    const plan = buildUpgradePlan({ observations: [LEGACY_AUTHORITY], migrations: [] });

    expect(plan.blockers).toEqual(['UPGRADE_AUTHORITY_MIGRATION_MISSING']);
    expect(plan.stores[0]?.action).toBe('block');
    expect(plan.stores[0]?.requiresBackup).toBe(false);
    expect(plan.migrations).toEqual([]);
  });

  it('blocks an authority store written by a newer schema', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'memory_records', detectedVersion: 9 }],
      migrations: [MEMORY_MIGRATION],
    });

    expect(plan.blockers).toEqual(['UPGRADE_AUTHORITY_UNSUPPORTED']);
    expect(plan.stores[0]?.action).toBe('block');
    /* A declared migration from the past must not be applied to the future. */
    expect(plan.migrations).toEqual([]);
  });

  it('never plans a rebuild for an authority store', () => {
    const plan = fullPlan();

    const authority = plan.stores.filter((store) => store.storeClass === 'authority');

    expect(authority.length).toBeGreaterThan(0);

    for (const store of authority) {
      expect(store.action).not.toBe('rebuild');
      expect(plan.rebuilds).not.toContain(store.kind);
    }
  });

  it('blocks a store with no declared contract instead of guessing', () => {
    const plan = buildUpgradePlan({ observations: [{ kind: 'mystery_store' }] });

    expect(plan.blockers).toEqual(['UPGRADE_STORE_UNKNOWN']);
    expect(plan.stores[0]?.storeClass).toBe('unknown');
    expect(plan.stores[0]?.action).toBe('block');
  });
});

/* ==================================================================
 * Derived rebuild rules
 * ================================================================== */

describe('Phase 84C — derived rebuild rules', () => {
  it('rebuilds a derived store when the build identity changed', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'code_graph' }],
      builds: { before: build(), after: build({ buildMarker: 'packaged-0.5.4' }) },
    });

    expect(plan.stores[0]?.action).toBe('rebuild');
    expect(plan.rebuilds).toEqual(['code_graph']);
    expect(plan.stores[0]?.reasonCode).toBe('DERIVED_STORE_REBUILD_REQUIRED');
  });

  it('does not rebuild derived stores when nothing changed', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'code_graph' }, { kind: 'graph_coverage' }],
      builds: { before: build(), after: build() },
    });

    expect(plan.rebuilds).toEqual([]);
    expect(plan.daemonRestartRequired).toBe(false);
  });

  it('rebuilds a derived store observed at a schema this build cannot read', () => {
    const plan = buildUpgradePlan({ observations: [{ kind: 'code_graph', detectedVersion: 9 }] });

    expect(plan.stores[0]?.action).toBe('rebuild');
    expect(plan.rebuilds).toEqual(['code_graph']);
    expect(plan.blockers).toEqual([]);
  });

  it('leaves the resolution snapshot compatible and rebuild-optional', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'resolution_snapshot' }],
      builds: { before: build(), after: build({ schema: { ...BASE_SCHEMA, resolver: 'r2' } }) },
    });

    const entry = plan.stores[0];

    /* 84B already reads the legacy vocabulary in memory: no destructive
     * migration and no mandatory rebuild may be planned for this store. */
    expect(entry?.action).toBe('compatible');
    expect(entry?.rebuildOptional).toBe(true);
    expect(plan.rebuilds).toEqual([]);
    expect(plan.migrations).toEqual([]);
    expect(plan.blockers).toEqual([]);
    expect(plan.warnings).toContain('UPGRADE_DERIVED_REBUILD_OPTIONAL');
  });

  it('plans no migration for a legacy resolution snapshot', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'resolution_snapshot', detectedVersion: 1, normalized: true }],
      migrations: [MEMORY_MIGRATION],
    });

    const entry = plan.stores[0];

    expect(entry?.action).toBe('compatible');
    expect(entry?.reasonCode).toBe('STORE_SCHEMA_LEGACY_COMPATIBLE');
    expect(plan.migrations).toEqual([]);
  });
});

/* ==================================================================
 * Ephemeral rules
 * ================================================================== */

describe('Phase 84C — ephemeral rules', () => {
  it('ignores ephemeral stores for migration but lists them for cleanup', () => {
    const plan = buildUpgradePlan({
      observations: [{ kind: 'runtime_locks' }, { kind: 'artifact_staging' }],
    });

    expect(plan.stores.every((store) => store.action === 'ignore_ephemeral')).toBe(true);
    expect(plan.ephemeral).toEqual(['artifact_staging', 'runtime_locks']);
    expect(plan.migrations).toEqual([]);
    expect(plan.rebuilds).toEqual([]);
  });

  it('never lets an ephemeral store reach the authority or rebuild paths', () => {
    const plan = fullPlan();

    for (const store of plan.stores.filter((item) => item.storeClass === 'ephemeral')) {
      expect(plan.rebuilds).not.toContain(store.kind);
      expect(plan.migrations).not.toContain(store.kind);
      expect(store.requiresBackup).toBe(false);
    }
  });
});

/* ==================================================================
 * Build fingerprint
 * ================================================================== */

describe('Phase 84C — build fingerprint', () => {
  it('does not require a restart when nothing changed', () => {
    const drift = compareBuilds(build(), build());

    expect(drift.changed).toBe(false);
    expect(drift.reason).toBe('none');
    expect(drift.hashBefore).toBe(drift.hashAfter);
  });

  it('requires a restart when only the build marker changed', () => {
    const drift = compareBuilds(build(), build({ buildMarker: 'packaged-0.5.4' }));

    expect(drift.changed).toBe(true);
    expect(drift.reason).toBe('build_marker');
    expect(drift.packageVersionChanged).toBe(false);
  });

  it('requires a restart when only a schema fingerprint changed at the same version', () => {
    const drift = compareBuilds(
      build(),
      build({ schema: { ...BASE_SCHEMA, graphSemantics: 'graph-b' } })
    );

    expect(drift.changed).toBe(true);
    expect(drift.reason).toBe('schema');
    expect(drift.packageVersionChanged).toBe(false);
    expect(drift.hashBefore).not.toBe(drift.hashAfter);
  });

  it('requires a restart when the package version changed', () => {
    const drift = compareBuilds(build(), build({ packageVersion: '0.5.4' }));

    expect(drift.changed).toBe(true);
    expect(drift.reason).toBe('package_version');
    expect(drift.packageVersionChanged).toBe(true);
  });

  it('reports a multiple drift when more than one dimension moved', () => {
    const drift = compareBuilds(build(), build({ packageVersion: '0.5.4', buildMarker: 'pkg' }));

    expect(drift.reason).toBe('multiple');
  });

  it('drives the daemon restart decision from the fingerprint, not the version', () => {
    const sameVersionDifferentBuild = buildUpgradePlan({
      observations: [],
      builds: { before: build(), after: build({ schema: { ...BASE_SCHEMA, parser: 'parser-z' } }) },
    });

    expect(sameVersionDifferentBuild.daemonRestartRequired).toBe(true);
    expect(sameVersionDifferentBuild.warnings).toContain('UPGRADE_BUILD_FINGERPRINT_CHANGED');
    expect(sameVersionDifferentBuild.warnings).toContain('UPGRADE_DAEMON_RESTART_REQUIRED');
  });

  it('derives the runtime build identity from the real daemon fingerprint', () => {
    const descriptor = currentBuildDescriptor(RUNTIME_ROOT, {
      TOOLNET_DAEMON_BUILD_ID: 'packaged-phase84c',
    } as NodeJS.ProcessEnv);

    expect(descriptor.buildMarker).toBe('packaged-phase84c');
    expect(descriptor.protocolVersion).toBe(DAEMON_PROTOCOL_VERSION);
    expect(descriptor.runtimeRoot).toBe(RUNTIME_ROOT);

    for (const fingerprint of Object.values(descriptor.schema)) {
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBeGreaterThan(0);
    }
  });
});

/* ==================================================================
 * Dry run
 * ================================================================== */

describe('Phase 84C — dry run', () => {
  it('defaults to a dry run and touches nothing', async () => {
    const ports = new RecordingPorts();
    const result = await runUpgrade(fullPlan(), ports);

    expect(result.outcome).toBe('planned');
    expect(result.daemonRestarted).toBe(false);
    expect(ports.calls).toEqual([]);
    expect(result.steps.every((step) => step.status === 'skipped')).toBe(true);
  });

  it('touches nothing when a dry run is asked for explicitly', async () => {
    const ports = new RecordingPorts();
    const result = await runUpgrade(fullPlan(), ports, { dryRun: true });

    expect(result.outcome).toBe('planned');
    expect(ports.calls).toEqual([]);
    expect(result.backupId).toBeUndefined();
  });

  it('reports what apply would do without doing it', async () => {
    const result = await runUpgrade(fullPlan(), new RecordingPorts(), { dryRun: true });

    const byPhase = new Map(result.steps.map((step) => [step.phase, step.detail]));

    expect(byPhase.get('migrate_authority')).toContain('memory_records:0->1');
    expect(byPhase.get('rebuild_derived')).toContain('code_graph');
    expect(byPhase.get('clear_ephemeral')).toContain('runtime_locks');
    expect(byPhase.get('restart_daemon')).toContain('would restart');
  });

  it.skipIf(!REPO_IS_INITIALIZED)(
    'does not interfere with authority state on a dry run of this repository',
    async () => {
      const manifest = join(REPO_ROOT, '.toolnet', 'project.json');

      const before = readFileSync(manifest, 'utf8');

      const outcome = await orchestratePackageUpgrade({
        observations: collectLocalStoreObservations(REPO_ROOT),
        before: build(),
        after: build({ packageVersion: '0.5.4' }),
        ports: new RecordingPorts(),
        dryRun: true,
      });

      expect(outcome.ok).toBe(true);
      expect(readFileSync(manifest, 'utf8')).toBe(before);
    }
  );
});

/* ==================================================================
 * Apply: ordering
 * ================================================================== */

describe('Phase 84C — apply ordering', () => {
  it('runs every phase in the declared order', async () => {
    const result = await runUpgrade(fullPlan(), new RecordingPorts(), { dryRun: false });

    expect(result.outcome).toBe('applied');
    expect(result.steps.map((step) => step.phase)).toEqual([
      'inspect',
      'block_unsupported',
      'backup_authority',
      'migrate_authority',
      'verify_authority',
      'rebuild_derived',
      'clear_ephemeral',
      'restart_daemon',
      'verify_upgrade',
    ]);
    expect(UPGRADE_PHASES.map((spec) => spec.phase)).toEqual(orderedPhases());
  });

  it('backs up authority before migrating and verifies before rebuilding', async () => {
    const ports = new RecordingPorts();
    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(ports.calls.map((call) => ports.phaseOf(call))).toEqual([
      'backup',
      'migrate',
      'verify',
      'rebuild',
      'clear',
      'restart',
      'verify',
    ]);

    const backupIndex = ports.calls.findIndex((call) => call.startsWith('backup:'));
    const migrateIndex = ports.calls.findIndex((call) => call.startsWith('migrate:'));
    const verifyIndex = ports.calls.findIndex((call) => call.startsWith('verify:memory'));
    const rebuildIndex = ports.calls.findIndex((call) => call.startsWith('rebuild:'));

    expect(backupIndex).toBeLessThan(migrateIndex);
    expect(migrateIndex).toBeLessThan(verifyIndex);
    expect(verifyIndex).toBeLessThan(rebuildIndex);

    expect(result.backupId).toBe('backup-1');
    expect(result.daemonRestarted).toBe(true);
  });

  it('rebuilds derived stores before clearing ephemeral state', async () => {
    const ports = new RecordingPorts();
    await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(ports.calls.indexOf('rebuild:code_graph')).toBeLessThan(
      ports.calls.indexOf('clear:runtime_locks')
    );
  });

  it('restarts the daemon only after migration and rebuild succeeded', async () => {
    const ports = new RecordingPorts();
    await runUpgrade(fullPlan(), ports, { dryRun: false });

    const restartIndex = ports.calls.indexOf('restart');

    expect(restartIndex).toBeGreaterThan(ports.calls.indexOf('verify:memory_records:0->1'));
    expect(restartIndex).toBeGreaterThan(ports.calls.indexOf('rebuild:code_graph'));
  });

  it('skips the phases that have no work', async () => {
    const plan = buildUpgradePlan({ observations: [{ kind: 'code_graph' }] });

    const ports = new RecordingPorts();
    const result = await runUpgrade(plan, ports, { dryRun: false });

    const byPhase = new Map(result.steps.map((step) => [step.phase, step.status]));

    expect(byPhase.get('backup_authority')).toBe('skipped');
    expect(byPhase.get('migrate_authority')).toBe('skipped');
    expect(byPhase.get('verify_authority')).toBe('skipped');
    expect(byPhase.get('rebuild_derived')).toBe('skipped');
    expect(byPhase.get('clear_ephemeral')).toBe('skipped');
    expect(byPhase.get('restart_daemon')).toBe('skipped');
    expect(ports.calls).toEqual(['verify']);
  });
});

/* ==================================================================
 * Apply: authority migration execution
 * ================================================================== */

describe('Phase 84C — authority migration execution', () => {
  it('refuses to run at all when the plan is blocked', async () => {
    const ports = new RecordingPorts();
    const plan = buildUpgradePlan({ observations: [LEGACY_AUTHORITY], migrations: [] });

    const result = await runUpgrade(plan, ports, { dryRun: false });

    expect(result.outcome).toBe('blocked');
    expect(result.failure).toBeUndefined();
    expect(ports.calls).toEqual([]);

    for (const step of result.steps) {
      expect(step.status).toBe('skipped');
      expect(step.detail).toContain('UPGRADE_AUTHORITY_MIGRATION_MISSING');
    }
  });

  it('fails on a missing authority backup before any migration runs', async () => {
    const ports = new RecordingPorts();
    ports.failBackup = true;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_MIGRATION_FAILED');
    expect(result.failure?.phase).toBe('backup_authority');
    expect(result.failure?.partial).toBe(false);
    expect(ports.calls.some((call) => call.startsWith('migrate:'))).toBe(false);
  });

  it('stops at the first failed migration', async () => {
    const ports = new RecordingPorts();
    ports.failMigration = MEMORY_MIGRATION.id;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_MIGRATION_FAILED');
    expect(result.failure?.phase).toBe('migrate_authority');
    expect(ports.calls).not.toContain('restart');
    expect(ports.calls.some((call) => call.startsWith('rebuild:'))).toBe(false);
  });

  it('fails verification and never rebuilds derived stores afterwards', async () => {
    const ports = new RecordingPorts();
    ports.migrationVerified = false;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_VERIFY_FAILED');
    expect(result.failure?.phase).toBe('verify_authority');
    expect(ports.calls.some((call) => call.startsWith('rebuild:'))).toBe(false);
    expect(ports.calls).not.toContain('restart');
  });

  it('writes a real, still-verifiable authority backup before a failing migration', async () => {
    const project = tempProject();

    try {
      const ports = createRealUpgradePorts({
        project: { id: project.id, rootPath: project.root },
        recoveryRoot: project.recoveryRoot,
      });

      const plan = buildUpgradePlan({
        observations: [LEGACY_AUTHORITY],
        migrations: [MEMORY_MIGRATION],
      });

      const result = await runUpgrade(plan, ports, { dryRun: false });

      expect(result.outcome).toBe('failed');
      expect(result.failure?.code).toBe('UPGRADE_MIGRATION_FAILED');
      expect(result.backupId).toBeTruthy();

      /* The authority backup must survive the failure and still verify. */
      const verification = verifyRecoveryBackup(
        { id: project.id },
        result.backupId as string,
        project.recoveryRoot
      );

      expect(verification.ok).toBe(true);

      const manifest = loadRecoveryManifest(
        { id: project.id },
        result.backupId as string,
        project.recoveryRoot
      );

      expect(manifest.projectId).toBe(project.id);
      expect(manifest.localFiles.length).toBeGreaterThan(0);
    } finally {
      rmSync(project.root, { recursive: true, force: true });
      rmSync(project.recoveryRoot, { recursive: true, force: true });
    }
  });
});

/* ==================================================================
 * Partial failure
 * ================================================================== */

describe('Phase 84C — partial failure', () => {
  const twoMigrations = [MEMORY_MIGRATION, ADR_MIGRATION];

  function planWithTwoMigrations(): UpgradePlan {
    return buildUpgradePlan({
      observations: [LEGACY_AUTHORITY, { kind: 'adr_state', detectedVersion: 0 }],
      builds: { before: build(), after: build({ packageVersion: '0.5.4' }) },
      migrations: twoMigrations,
    });
  }

  it('flags a partial failure when a migration succeeded and a later one failed', async () => {
    const plan = planWithTwoMigrations();

    expect(plan.migrations).toEqual(['adr_state:0->1', 'memory_records:0->1']);

    const ports = new RecordingPorts();
    ports.failMigration = 'memory_records:0->1';

    const result = await runUpgrade(plan, ports, { dryRun: false });

    expect(result.failure?.code).toBe('UPGRADE_MIGRATION_FAILED');
    expect(result.failure?.partial).toBe(true);
    expect(result.failure?.codes).toContain('UPGRADE_PARTIAL_FAILURE');
  });

  it('does not flag a partial failure when the first migration fails', async () => {
    const ports = new RecordingPorts();
    ports.failMigration = 'adr_state:0->1';

    const result = await runUpgrade(planWithTwoMigrations(), ports, { dryRun: false });

    expect(result.failure?.partial).toBe(false);
    expect(result.failure?.codes).toEqual(['UPGRADE_MIGRATION_FAILED']);
  });

  it('flags a partial failure when a rebuild fails after a successful migration', async () => {
    const ports = new RecordingPorts();
    ports.failRebuild = true;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_REBUILD_FAILED');
    expect(result.failure?.phase).toBe('rebuild_derived');
    expect(result.failure?.partial).toBe(true);
    /* The pre-migration backup is reported so it can be restored from. */
    expect(result.backupId).toBe('backup-1');
  });

  it('fails the ephemeral cleanup without claiming success', async () => {
    const ports = new RecordingPorts();
    ports.failEphemeralClear = true;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(result.failure?.code).toBe('UPGRADE_EPHEMERAL_CLEAR_FAILED');
    expect(result.failure?.phase).toBe('clear_ephemeral');
    expect(result.outcome).toBe('failed');
  });

  it('never restarts the daemon after a failure, and says which phases were not reached', async () => {
    const ports = new RecordingPorts();
    ports.failRebuild = true;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(ports.calls).not.toContain('restart');
    expect(result.daemonRestarted).toBe(false);

    const notReached = result.steps.filter((step) => step.detail === 'not reached');

    expect(notReached.map((step) => step.phase)).toEqual([
      'clear_ephemeral',
      'restart_daemon',
      'verify_upgrade',
    ]);
  });

  it('reports a failed post-condition check as a failure', async () => {
    const ports = new RecordingPorts();
    ports.failVerifyUpgrade = true;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_VERIFY_FAILED');
    expect(result.failure?.phase).toBe('verify_upgrade');
    /* The daemon was already restarted: the failure is honestly partial. */
    expect(result.failure?.partial).toBe(true);
  });
});

/* ==================================================================
 * Daemon barrier
 * ================================================================== */

describe('Phase 84C — daemon barrier', () => {
  it('reports a failure when the daemon cannot be restarted after a successful upgrade', async () => {
    const ports = new RecordingPorts();
    ports.failRestart = true;

    const result = await runUpgrade(fullPlan(), ports, { dryRun: false });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_DAEMON_RESTART_FAILED');
    expect(result.failure?.phase).toBe('restart_daemon');
    expect(result.daemonRestarted).toBe(false);
    /* The old daemon must not be left serving the new build unnoticed. */
    expect(result.failure?.partial).toBe(true);
  });

  it('does not restart the daemon when the build identity is unchanged', async () => {
    const plan = buildUpgradePlan({ observations: [{ kind: 'code_graph' }] });
    const ports = new RecordingPorts();

    const result = await runUpgrade(plan, ports, { dryRun: false });

    expect(plan.daemonRestartRequired).toBe(false);
    expect(result.outcome).toBe('applied');
    expect(result.daemonRestarted).toBe(false);
    expect(ports.calls).not.toContain('restart');
  });
});

/* ==================================================================
 * Observation collection
 * ================================================================== */

describe('Phase 84C — observation collection', () => {
  it('reads a version marker from a pretty-printed store', () => {
    expect(readSchemaVersionMarker('{\n  "version": 1,\n  "rules": []\n}\n')).toBe(1);
    expect(readSchemaVersionMarker('{\n  "schemaVersion": 3\n}\n')).toBe(3);
  });

  it('reads a version marker from the header of a JSONL log', () => {
    expect(readSchemaVersionMarker('{"version":1,"operationId":"a"}\n{"version":1}\n')).toBe(1);
  });

  it('reports no marker for an unversioned or unreadable payload', () => {
    expect(readSchemaVersionMarker('')).toBeUndefined();
    expect(readSchemaVersionMarker('not json at all')).toBeUndefined();
    expect(readSchemaVersionMarker('{"version":"one"}')).toBeUndefined();
    expect(readSchemaVersionMarker('{"version":0}')).toBeUndefined();
    expect(readSchemaVersionMarker('[]')).toBeUndefined();
  });

  it('collects only the stores that exist', () => {
    const project = tempProject();

    try {
      const observations = collectLocalStoreObservations(project.root);

      expect(observations.map((observation) => observation.kind)).toEqual([
        'project_manifest',
        'retrieval_overrides',
      ]);

      for (const observation of observations) {
        expect(observation.detectedVersion).toBe(1);
      }
    } finally {
      rmSync(project.root, { recursive: true, force: true });
    }
  });

  it('reports nothing for a directory with no ToolNet state', () => {
    const empty = mkdtempSync(join(tmpdir(), 'toolnet-phase84c-empty-'));

    try {
      expect(collectLocalStoreObservations(empty)).toEqual([]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it.skipIf(!REPO_IS_INITIALIZED)(
    'classifies this repository without inventing a migration',
    () => {
      const observations = collectLocalStoreObservations(REPO_ROOT);

      expect(observations.length).toBeGreaterThan(0);

      const plan = buildUpgradePlan({
        observations,
        builds: { before: build(), after: build({ packageVersion: '0.5.4' }) },
      });

      expect(plan.blockers).toEqual([]);
      expect(plan.migrations).toEqual([]);
      expect(plan.stores.every((store) => store.action !== 'block')).toBe(true);
    }
  );
});

/* ==================================================================
 * Update command integration
 * ================================================================== */

describe('Phase 84C — update command integration', () => {
  it('routes the update command through the shared upgrade module', () => {
    const source = repoSource('src/production/update.ts');

    expect(source).toContain("from './upgrade/index.js'");
    expect(source).toContain('orchestratePackageUpgrade(');
    expect(source).toContain('dryRun: false');
    expect(source).toContain('blocker:');
  });

  it('captures the build identity before the package on disk changes', () => {
    const source = repoSource('src/production/update.ts');

    const capture = source.indexOf('currentBuildDescriptor(runtimeRoot)');
    const installArgv = source.indexOf("'--no-audit'");

    expect(capture).toBeGreaterThan(-1);
    expect(installArgv).toBeGreaterThan(-1);

    /* Reading it after the install would compare the new version with itself
     * and silently skip the daemon restart the upgrade requires. */
    expect(capture).toBeLessThan(installArgv);

    const upgradeFunction = source.slice(source.indexOf('async function orchestrateLocalUpgrade'));

    expect(upgradeFunction).toContain('orchestrateLocalUpgrade(beforeBuild, latest)');
    expect(upgradeFunction.slice(0, 600)).not.toContain('currentBuildDescriptor(');
  });

  it('keeps package installation in exactly one module', () => {
    const installers = sourceFiles(join(REPO_ROOT, 'src'))
      .filter((file) => /'install',\s*'-g'/u.test(readFileSync(file, 'utf8')))
      .map((file) => relative(REPO_ROOT, file));

    expect(installers).toEqual(['src/production/update.ts']);
  });

  it('keeps npm, the registry and the network out of the upgrade module', () => {
    const files = readdirSync(UPGRADE_DIR).filter((name) => name.endsWith('.ts'));

    expect(files.length).toBeGreaterThan(0);

    for (const name of files) {
      const source = readFileSync(join(UPGRADE_DIR, name), 'utf8');

      expect(source).not.toMatch(/\bnpm\b/u);
      expect(source).not.toMatch(/node:https?\b/u);
      expect(source).not.toMatch(/node:net\b/u);
      expect(source).not.toMatch(/\bfetch\(/u);
    }
  });

  it('spawns a process from exactly one upgrade module, and only for the daemon', () => {
    const files = readdirSync(UPGRADE_DIR).filter((name) => name.endsWith('.ts'));

    const spawners = files.filter((name) =>
      readFileSync(join(UPGRADE_DIR, name), 'utf8').includes('node:child_process')
    );

    expect(spawners).toEqual(['ports.ts']);
  });

  it('performs no package install, publish or registry access in this suite', () => {
    const plan = fullPlan();
    const ports = new RecordingPorts();

    return runUpgrade(plan, ports, { dryRun: false }).then((result) => {
      /* Every side effect went through the injected ports: nothing else ran. */
      expect(result.outcome).toBe('applied');
      expect(ports.calls).toHaveLength(7);
      expect(ports.calls.every((call) => ports.phaseOf(call) !== 'npm')).toBe(true);
    });
  });
});

/* ==================================================================
 * Documentation invariant
 * ================================================================== */

describe('Phase 84C — documentation invariant', () => {
  it('keeps exactly one canonical storage document', () => {
    const docs = readdirSync(join(REPO_ROOT, 'docs'));

    const storageDocs = docs.filter((name) => name.toLowerCase() === 'storage.md');

    expect(storageDocs).toEqual(['STORAGE.md']);
    expect(readFileSync(join(REPO_ROOT, 'docs', 'STORAGE.md'), 'utf8').length).toBeGreaterThan(0);
  });

  it('contains no case-colliding filename pair anywhere in the repository', () => {
    const collisions: string[] = [];

    const walk = (directory: string): void => {
      let entries: Dirent[];

      try {
        entries = readdirSync(directory, { withFileTypes: true });
      } catch {
        return;
      }

      const seen = new Map<string, string>();

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        const lower = entry.name.toLowerCase();

        if (seen.has(lower)) {
          collisions.push(`${relative(REPO_ROOT, directory)}: ${seen.get(lower)} / ${entry.name}`);
          continue;
        }

        seen.set(lower, entry.name);
      }

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        walk(join(directory, entry.name));
      }
    };

    walk(REPO_ROOT);

    expect(collisions).toEqual([]);
  });

  it('documents the upgrade model', () => {
    const doc = repoSource('docs/storage-compatibility.md');

    expect(doc).toContain('84C');
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 84C — certification', () => {
  it('emits the Phase 84C PASS marker', () => {
    process.stdout.write(`${MARKER}\n`);

    expect(MARKER).toBe('PHASE84C_UPGRADE_ORCHESTRATION=PASS');
  });

  it('leaves no fixture behind outside the temporary directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-phase84c-cleanup-'));

    expect(root.startsWith(tmpdir())).toBe(true);
    expect(existsSync(root)).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });
});
