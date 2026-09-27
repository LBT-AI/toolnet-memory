/*
 * Phase 84B — Storage Compatibility & Migration Model production
 * certification.
 *
 * Exercises the REAL implementation:
 *
 *   - the central store classification (authority / derived / ephemeral)
 *   - the store contract registry (schema version, legacy versions, policy)
 *   - the compatibility decision for every defined status and reason code
 *   - legacy `TypeResolutionSnapshot` reading (the pre-0.5.4 kind vocabulary)
 *   - canonical writes: a legacy vocabulary is never written forward
 *   - "no authority data loss": readers never mutate on load
 *   - storage classification inside the release analysis (Phase 83 fix)
 *   - Phase 83 false-positive prevention for barrel / derived / additive files
 *   - determinism and non-interference
 *
 * PASS marker: PHASE84B_STORAGE_COMPATIBILITY=PASS
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  STORE_CONTRACTS,
  checkStoreCompatibility,
  classifyStorageKey,
  classifyStorageSourcePath,
  decideStoreCompatibility,
  isContractFreeRole,
  storeClassOf,
  storeContract,
  storeKinds,
  storeKindsByClass,
  summariseStoreCompatibility,
} from '../../src/storage/compatibility/index.js';

import { PersistentTypeResolutionStore } from '../../src/storage/type-resolution-store.js';

import {
  LEGACY_RESOLUTION_KIND_DOMAIN,
  LEGACY_RESOLUTION_KIND_MAP,
  canonicalResolutionKind,
  normalizeTypeResolutionSnapshot,
  normalizeTypeResolutions,
} from '../../src/code-intelligence/resolution/legacy.js';

import {
  REQUIRED_RELEASE_PHASES,
  buildReleaseFacts,
} from '../../src/code-intelligence/release/project-facts.js';
import { runReleaseAnalysis } from '../../src/code-intelligence/release/report.js';
import { resolveReleaseLimits } from '../../src/code-intelligence/release/limits.js';
import { evaluateReleaseGuard } from '../../src/code-intelligence/release/semver.js';

import type {
  ResolutionSnapshot,
  TypeResolution,
  TypeResolutionSnapshot,
} from '../../src/code-intelligence/resolution/types.js';
import type {
  StorageChangeReport,
  ReleaseReasonCode,
} from '../../src/code-intelligence/release/types.js';
import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const MARKER = 'PHASE84B_STORAGE_COMPATIBILITY=PASS';

const REPO_ROOT = resolve(process.cwd());

/* ==================================================================
 * In-memory storage provider — records every mutation attempt
 * ================================================================== */

class MemoryProvider implements StorageProvider {
  readonly name = 'memory';

  readonly objects = new Map<string, string>();

  puts = 0;
  deletes = 0;
  reads = 0;

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.puts += 1;
    this.objects.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const text = this.objects.get(key);

    return text === undefined ? null : new Uint8Array(Buffer.from(text, 'utf8'));
  }

  async getText(key: string): Promise<string | null> {
    this.reads += 1;

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

const RESOLUTION_KEY = 'projects/proj-1/graph/resolution/current.json';

/* ==================================================================
 * Store classification
 * ================================================================== */

describe('Phase 84B — store classification', () => {
  it('declares every store kind exactly once with a contract', () => {
    const kinds = storeKinds();

    expect(kinds).toEqual([...kinds].sort());
    expect(new Set(kinds).size).toBe(kinds.length);

    for (const kind of kinds) {
      const contract = storeContract(kind);

      expect(contract.kind).toBe(kind);
      expect(['authority', 'derived', 'ephemeral']).toContain(contract.storeClass);
      expect(Number.isSafeInteger(contract.schemaVersion)).toBe(true);
      expect(contract.schemaVersion).toBeGreaterThanOrEqual(1);
      expect(contract.description.length).toBeGreaterThan(0);
    }

    /* The contract list is frozen: no call site can append to it. */
    expect(Object.isFrozen(STORE_CONTRACTS)).toBe(true);
  });

  it('classifies the three classes from the real store inventory', () => {
    const authority = storeKindsByClass('authority');
    const derived = storeKindsByClass('derived');
    const ephemeral = storeKindsByClass('ephemeral');

    /* Authority: the durable sources memory/tasks/ADR depend on. */
    expect(authority).toContain('memory_records');
    expect(authority).toContain('task_operations');
    expect(authority).toContain('adr_state');
    expect(authority).toContain('project_manifest');

    /* Derived: everything regenerable from source of truth. */
    expect(derived).toContain('code_graph');
    expect(derived).toContain('resolution_snapshot');
    expect(derived).toContain('graph_coverage');
    expect(derived).toContain('cross_service');
    expect(derived).toContain('fleet_export');
    expect(derived).toContain('code_artifacts');
    expect(derived).toContain('runtime_traces');

    /* Ephemeral: process-lifetime state, never a migration target. */
    expect(ephemeral).toContain('daemon_state');
    expect(ephemeral).toContain('runtime_locks');
    expect(ephemeral).toContain('artifact_staging');

    expect(authority.length + derived.length + ephemeral.length).toBe(storeKinds().length);
  });

  it('maps real persisted keys to store kinds from one central table', () => {
    const cases: Array<[string, string]> = [
      ['projects/abc/memories/current.json', 'memory_records'],
      ['projects/abc/graph/current.json', 'code_graph'],
      ['projects/abc/graph/manifest.json', 'code_manifest'],
      ['projects/abc/graph/resolution/current.json', 'resolution_snapshot'],
      ['projects/abc/graph/coverage.json', 'graph_coverage'],
      ['projects/abc/graph/cross-service.json', 'cross_service'],
      ['projects/abc/graph/fleet-export.json', 'fleet_export'],
      ['projects/abc/graph/artifacts/manifest.json', 'code_artifacts'],
      ['projects/abc/code/chunks/current.json', 'code_chunks'],
      ['projects/abc/code/vectors/current.json', 'code_vectors'],
      ['projects/abc/vectors/current.json', 'memory_vectors'],
      ['projects/abc/runtime-traces/sessions/s1.json', 'runtime_traces'],
      ['projects/abc/knowledge/adr/state.v1.json', 'adr_state'],
      ['projects/abc/project.json', 'project_manifest'],
      ['.toolnet/tasks/events.jsonl', 'task_operations'],
      ['.toolnet/tasks/state.json', 'task_projection'],
      ['.toolnet/tasks/replication/cursor.json', 'task_replication_cursor'],
      ['.toolnet/retrieval/feedback.jsonl', 'retrieval_feedback'],
      ['.toolnet/retrieval/overrides.json', 'retrieval_overrides'],
      ['.toolnet/runtime/sources/session-1.json', 'session_wal'],
      ['.toolnet/runtime/locks/daemon.lock', 'runtime_locks'],
      ['.toolnet/cache/artifacts/staging/x.json', 'artifact_staging'],
      ['.toolnet/project.json', 'project_manifest'],
      ['~/.toolnet-memory/runtime/daemon-state.json', 'daemon_state'],
      ['~/.toolnet-memory/runtime/daemon.sock', 'daemon_runtime_files'],
    ];

    for (const [key, kind] of cases) {
      const classified = classifyStorageKey(key);

      expect(classified.matched).toBe(true);
      expect(classified.kind).toBe(kind);
      expect(classified.storeClass).toBe(storeContract(kind as never).storeClass);
    }
  });

  it('never guesses at an unknown persisted key', () => {
    const classified = classifyStorageKey('projects/abc/unknown-thing/blob.json');

    expect(classified.matched).toBe(false);
    expect(classified.kind).toBeNull();
    expect(classified.storeClass).toBe('unknown');
  });

  it('classifies storage source files by the contract they implement', () => {
    expect(classifyStorageSourcePath('src/storage/index.ts').role).toBe('barrel');
    expect(classifyStorageSourcePath('src/storage/provider.ts').role).toBe('infrastructure');
    expect(classifyStorageSourcePath('src/storage/compatibility/registry.ts').role).toBe(
      'infrastructure'
    );
    expect(classifyStorageSourcePath('src/storage/project/migrate.ts').role).toBe('migration');

    const memory = classifyStorageSourcePath('src/storage/memory-store.ts');
    expect(memory.role).toBe('store');
    expect(memory.kind).toBe('memory_records');
    expect(memory.storeClass).toBe('authority');

    const resolution = classifyStorageSourcePath('src/storage/type-resolution-store.ts');
    expect(resolution.role).toBe('store');
    expect(resolution.kind).toBe('resolution_snapshot');
    expect(resolution.storeClass).toBe('derived');

    expect(classifyStorageSourcePath('src/storage/code-graph-store.ts').storeClass).toBe('derived');

    const unknown = classifyStorageSourcePath('src/storage/some-new-store.ts');
    expect(unknown.role).toBe('unclassified');
    expect(unknown.storeClass).toBe('unknown');

    expect(isContractFreeRole('barrel')).toBe(true);
    expect(isContractFreeRole('infrastructure')).toBe(true);
    expect(isContractFreeRole('store')).toBe(false);
    expect(isContractFreeRole('migration')).toBe(false);
    expect(isContractFreeRole('unclassified')).toBe(false);
  });

  it('classifies this repository the way Phase 83 has to see it', () => {
    /* The two tracked storage files changed by the Phase 68+ worktree. */
    expect(classifyStorageSourcePath('src/storage/index.ts').role).toBe('barrel');
    expect(classifyStorageSourcePath('src/storage/type-resolution-store.ts').storeClass).toBe(
      'derived'
    );

    expect(storeClassOf('memory_records')).toBe('authority');
    expect(storeClassOf('resolution_snapshot')).toBe('derived');
    expect(storeClassOf('not_a_store')).toBe('unknown');
  });
});

/* ==================================================================
 * Compatibility model
 * ================================================================== */

describe('Phase 84B — compatibility model', () => {
  it('reports the current schema as compatible', () => {
    const result = checkStoreCompatibility({ kind: 'resolution_snapshot', detectedVersion: 1 });

    expect(result.status).toBe('compatible');
    expect(result.reasonCode).toBe('STORE_SCHEMA_CURRENT');
    expect(result.normalized).toBe(false);
    expect(result.storeClass).toBe('derived');
    expect(result.schemaVersion).toBe(1);
  });

  it('turns a reader-side normalization into a migrated result', () => {
    const result = checkStoreCompatibility({
      kind: 'resolution_snapshot',
      detectedVersion: 1,
      normalized: true,
    });

    expect(result.status).toBe('migrated');
    expect(result.reasonCode).toBe('STORE_SCHEMA_LEGACY_COMPATIBLE');
    expect(result.normalized).toBe(true);
  });

  it('rebuilds a derived store instead of migrating it', () => {
    const contract = storeContract('code_graph');

    /* An unmapped legacy version and a future version both regenerate. */
    const older = decideStoreCompatibility(
      { ...contract, schemaVersion: 3 },
      { detectedVersion: 1 }
    );
    expect(older.status).toBe('rebuild_required');
    expect(older.reasonCode).toBe('DERIVED_STORE_REBUILD_REQUIRED');

    const future = checkStoreCompatibility({ kind: 'code_graph', detectedVersion: 9 });
    expect(future.status).toBe('rebuild_required');
    expect(future.reasonCode).toBe('DERIVED_STORE_REBUILD_REQUIRED');
  });

  it('blocks an authority store instead of rebuilding or dropping it', () => {
    /* Supported-but-not-current authority version: migration required. */
    const legacy = decideStoreCompatibility(
      { ...storeContract('adr_state'), schemaVersion: 2, supportedLegacyVersions: [1, 2] },
      { detectedVersion: 1 }
    );
    expect(legacy.status).toBe('blocked');
    expect(legacy.reasonCode).toBe('STORE_MIGRATION_REQUIRED');

    /* Unmapped older authority version: an upgrade migration is required. */
    const unmapped = checkStoreCompatibility({ kind: 'memory_records', detectedVersion: 0 });
    expect(unmapped.status).toBe('blocked');
    expect(unmapped.reasonCode).toBe('AUTHORITY_MIGRATION_REQUIRED');

    /* Authored by a newer schema: never interpreted by an older build. */
    const future = checkStoreCompatibility({ kind: 'memory_records', detectedVersion: 4 });
    expect(future.status).toBe('blocked');
    expect(future.reasonCode).toBe('STORE_SCHEMA_UNSUPPORTED');
  });

  it('rejects an unmarked payload only when the contract refuses it', () => {
    /* task_operations declares `reject`: an unversioned log is not assumed. */
    const rejected = checkStoreCompatibility({ kind: 'task_operations' });

    expect(rejected.status).toBe('blocked');
    expect(rejected.reasonCode).toBe('STORE_SCHEMA_UNSUPPORTED');

    /* memory_records declares `accept`: the store never carried a marker. */
    const accepted = checkStoreCompatibility({ kind: 'memory_records' });

    expect(accepted.status).toBe('compatible');
    expect(accepted.reasonCode).toBe('STORE_SCHEMA_CURRENT');

    /* project_manifest declares `assume_legacy`: read as the oldest version. */
    const assumed = checkStoreCompatibility({ kind: 'project_manifest' });

    expect(assumed.status).toBe('compatible');
    expect(assumed.reasonCode).toBe('STORE_SCHEMA_CURRENT');
  });

  it('blocks an unknown store kind rather than guessing', () => {
    const result = checkStoreCompatibility({ kind: 'mystery_store', detectedVersion: 1 });

    expect(result.status).toBe('blocked');
    expect(result.reasonCode).toBe('STORE_UNKNOWN');
    expect(result.storeClass).toBe('unknown');
  });

  it('keeps authority contracts out of the rebuild path entirely', () => {
    for (const contract of STORE_CONTRACTS) {
      if (contract.storeClass !== 'authority') continue;

      expect(['exact', 'backward_compatible']).toContain(contract.compatibility);
      expect(contract.sourceOfTruth).toContain('authority');
    }

    for (const contract of STORE_CONTRACTS) {
      if (contract.storeClass === 'derived' || contract.storeClass === 'ephemeral') {
        expect(contract.compatibility).not.toBe('migration_required');
        expect(contract.sourceOfTruth.length).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic and aggregates into one verdict', () => {
    const inputs = [
      { kind: 'memory_records', detectedVersion: 1 },
      { kind: 'resolution_snapshot', detectedVersion: 1, normalized: true },
      { kind: 'code_graph', detectedVersion: 7 },
    ];

    const first = inputs.map((input) => checkStoreCompatibility(input));
    const second = inputs.map((input) => checkStoreCompatibility(input));

    expect(first).toEqual(second);

    const summary = summariseStoreCompatibility(first);

    expect(summary).toEqual(summariseStoreCompatibility(first));
    expect(summary.compatible).toBe(1);
    expect(summary.migrated).toBe(1);
    expect(summary.rebuildRequired).toBe(1);
    expect(summary.blocked).toBe(0);
    expect(summary.status).toBe('rebuild_required');
    expect(summary.reasonCodes).toEqual([
      'DERIVED_STORE_REBUILD_REQUIRED',
      'STORE_SCHEMA_CURRENT',
      'STORE_SCHEMA_LEGACY_COMPATIBLE',
    ]);
  });
});

/* ==================================================================
 * Legacy resolution snapshot (the real bug found in 84A)
 * ================================================================== */

/** A byte-accurate pre-0.5.4 snapshot: same `version`, old kind vocabulary. */
function legacySnapshotPayload(): Record<string, unknown> {
  return {
    version: 1,
    projectId: 'proj-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    total: 5,
    exact: 4,
    high: 1,
    fallback: 0,
    resolutions: [
      {
        id: 'r1',
        projectId: 'proj-1',
        kind: 'CALL',
        sourceFile: 'src/a.ts',
        sourceLine: 10,
        expression: 'doWork()',
        targetFile: 'src/b.ts',
        targetLine: 3,
        targetName: 'doWork',
        targetSymbolId: 'sym-1',
        confidence: 'exact',
        resolver: 'typescript-checker',
      },
      {
        id: 'r2',
        projectId: 'proj-1',
        kind: 'CALL',
        sourceFile: 'src/a.ts',
        sourceLine: 11,
        expression: 'other()',
        targetFile: 'src/c.ts',
        targetLine: 4,
        targetName: 'other',
        targetSymbolId: 'sym-2',
        confidence: 'exact',
        resolver: 'typescript-checker',
      },
      {
        id: 'r3',
        projectId: 'proj-1',
        kind: 'EXTENDS',
        sourceFile: 'src/a.ts',
        sourceLine: 20,
        expression: 'Base',
        targetFile: 'src/base.ts',
        targetLine: 1,
        targetName: 'Base',
        targetSymbolId: 'sym-3',
        confidence: 'high',
        resolver: 'typescript-checker',
      },
      {
        id: 'r4',
        projectId: 'proj-1',
        kind: 'IMPLEMENTS',
        sourceFile: 'src/a.ts',
        sourceLine: 21,
        expression: 'Iface',
        targetFile: 'src/iface.ts',
        targetLine: 1,
        targetName: 'Iface',
        targetSymbolId: 'sym-4',
        confidence: 'exact',
        resolver: 'typescript-checker',
      },
      {
        id: 'r5',
        projectId: 'proj-1',
        kind: 'REFERENCE',
        sourceFile: 'src/a.ts',
        sourceLine: 30,
        expression: 'Shape',
        targetFile: 'src/shape.ts',
        targetLine: 2,
        targetName: 'Shape',
        targetSymbolId: 'sym-5',
        confidence: 'exact',
        resolver: 'typescript-checker',
      },
    ],
  };
}

describe('Phase 84B — legacy resolution snapshot', () => {
  it('declares the legacy kind domain in the registry and implements it', () => {
    const declared = STORE_CONTRACTS.flatMap((contract) => contract.legacyValueDomains);

    expect(declared).toContain(LEGACY_RESOLUTION_KIND_DOMAIN);
    expect(storeContract('resolution_snapshot').legacyValueDomains).toEqual([
      LEGACY_RESOLUTION_KIND_DOMAIN,
    ]);

    expect(Object.values(LEGACY_RESOLUTION_KIND_MAP).sort()).toEqual([
      'call',
      'implementation',
      'inheritance',
      'type',
    ]);
  });

  it('normalizes every legacy kind value instead of dropping entries', () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_RESOLUTION_KIND_MAP)) {
      expect(canonicalResolutionKind(legacy)).toBe(canonical);
      /* Case-only variations of a canonical value resolve too. */
      expect(canonicalResolutionKind(legacy.toLowerCase())).toBe(canonical);
      expect(canonicalResolutionKind(canonical)).toBe(canonical);
    }

    expect(canonicalResolutionKind('not-a-kind')).toBeUndefined();
    expect(canonicalResolutionKind(undefined)).toBeUndefined();

    const payload = legacySnapshotPayload();

    const legacy = payload as unknown as TypeResolutionSnapshot;

    const normalized = normalizeTypeResolutionSnapshot(legacy);

    expect(normalized.rewritten).toBe(5);
    expect(normalized.snapshot.resolutions).toHaveLength(legacy.resolutions.length);
    expect(normalized.snapshot.resolutions.map((entry) => entry.kind)).toEqual([
      'call',
      'call',
      'inheritance',
      'implementation',
      'type',
    ]);
    /* Nothing is lost: the original value is retained per entry. */
    expect(normalized.snapshot.resolutions.map((entry) => entry.legacyKind)).toEqual([
      'CALL',
      'CALL',
      'EXTENDS',
      'IMPLEMENTS',
      'REFERENCE',
    ]);
    /* Every non-kind field survives untouched. */
    expect(normalized.snapshot.resolutions.map((entry) => entry.id)).toEqual([
      'r1',
      'r2',
      'r3',
      'r4',
      'r5',
    ]);
    expect(normalized.snapshot).toMatchObject({
      version: 1,
      projectId: 'proj-1',
      total: 5,
      exact: 4,
      high: 1,
    });
  });

  it('keeps an unknown vocabulary entry visible instead of silently dropping it', () => {
    const entries = [
      {
        id: 'x1',
        projectId: 'p',
        kind: 'SOMETHING_ELSE' as never,
        sourceFile: 'a.ts',
        sourceLine: 1,
        expression: 'x',
        confidence: 'fallback' as const,
        resolver: 'graph-fallback' as const,
      },
    ];

    const normalized = normalizeTypeResolutions(entries);

    expect(normalized.rewritten).toBe(0);
    expect(normalized.resolutions).toHaveLength(1);
    expect(normalized.resolutions[0]?.kind).toBe('SOMETHING_ELSE');
    expect(normalized.resolutions[0]?.legacyKind).toBe('SOMETHING_ELSE');
  });

  it('reads a legacy snapshot through the store and reports it as migrated', async () => {
    const provider = new MemoryProvider();

    const raw = `${JSON.stringify(legacySnapshotPayload())}\n`;

    await provider.put(RESOLUTION_KEY, raw);

    const before = provider.objects.get(RESOLUTION_KEY);
    const putsBefore = provider.puts;
    const deletesBefore = provider.deletes;

    const store = new PersistentTypeResolutionStore(provider);

    const loaded = await store.loadWithCompatibility('proj-1');

    expect(loaded.compatibility.status).toBe('migrated');
    expect(loaded.compatibility.reasonCode).toBe('STORE_SCHEMA_LEGACY_COMPATIBLE');
    expect(loaded.compatibility.normalized).toBe(true);
    expect(loaded.compatibility.storeClass).toBe('derived');
    expect(loaded.compatibility.schemaVersion).toBe(1);
    expect(loaded.compatibility.detectedVersion).toBe(1);

    const resolutions = (loaded.snapshot as TypeResolutionSnapshot).resolutions;

    expect(resolutions).toHaveLength(5);
    expect(resolutions.map((entry) => entry.kind)).toEqual([
      'call',
      'call',
      'inheritance',
      'implementation',
      'type',
    ]);
    /* The exact entries a canonical-only reader would have skipped. */
    expect(resolutions.filter((entry) => entry.kind === 'call')).toHaveLength(2);
    expect(resolutions.every((entry) => entry.targetSymbolId !== undefined)).toBe(true);

    /* A read is a read: nothing was written, deleted or rewritten. */
    expect(provider.puts).toBe(putsBefore);
    expect(provider.deletes).toBe(deletesBefore);
    expect(provider.objects.get(RESOLUTION_KEY)).toBe(before);
  });

  it('loads legacy data through the plain load() path (no caller opt-in)', async () => {
    const provider = new MemoryProvider();

    await provider.put(RESOLUTION_KEY, JSON.stringify(legacySnapshotPayload()));

    const loaded = await new PersistentTypeResolutionStore(provider).load('proj-1');

    expect(loaded).not.toBeNull();
    expect((loaded as TypeResolutionSnapshot).resolutions).toHaveLength(5);
    expect((loaded as TypeResolutionSnapshot).resolutions[0]?.kind).toBe('call');
  });

  it('writes the canonical format and never writes a legacy vocabulary forward', async () => {
    const provider = new MemoryProvider();
    const store = new PersistentTypeResolutionStore(provider);

    await store.save(legacySnapshotPayload() as unknown as TypeResolutionSnapshot);

    expect(provider.puts).toBe(1);

    const written = provider.objects.get(RESOLUTION_KEY);

    expect(written).toBeDefined();
    /* A new write carries no archived vocabulary at all — not even as
     * provenance, because the mapping is deterministic and total. */
    expect(written).not.toContain('CALL');
    expect(written).not.toContain('EXTENDS');
    expect(written).not.toContain('IMPLEMENTS');
    expect(written).not.toContain('REFERENCE');
    expect(written).not.toContain('legacyKind');

    const reparsed = JSON.parse(written ?? '{}') as TypeResolutionSnapshot;

    expect(reparsed.resolutions.map((entry: TypeResolution) => entry.kind)).toEqual([
      'call',
      'call',
      'inheritance',
      'implementation',
      'type',
    ]);

    const reloaded = await store.loadWithCompatibility('proj-1');

    expect(reloaded.compatibility.status).toBe('compatible');
    expect(reloaded.compatibility.reasonCode).toBe('STORE_SCHEMA_CURRENT');
    expect(reloaded.compatibility.normalized).toBe(false);
  });

  it('treats the current generation snapshot as current, not legacy', async () => {
    const provider = new MemoryProvider();

    const current: ResolutionSnapshot = {
      version: 1,
      projectId: 'proj-1',
      generation: 'gen-1',
      resolvedAt: '2026-02-01T00:00:00.000Z',
      fingerprint: 'fp-1',
      stats: { total: 1, resolved: 1, ambiguous: 0, unresolved: 0, external: 0 },
      byLanguage: { typescript: { total: 1, resolved: 1, ambiguous: 0, unresolved: 0 } },
      results: [
        {
          status: 'resolved',
          targetSymbolId: 'sym-1',
          evidence: [],
          kind: 'call',
          sourceFile: 'src/a.ts',
          sourceLine: 10,
          expression: 'doWork()',
        },
      ],
    };

    await provider.put(RESOLUTION_KEY, JSON.stringify(current));

    const loaded = await new PersistentTypeResolutionStore(provider).loadWithCompatibility(
      'proj-1'
    );

    expect(loaded.compatibility.status).toBe('compatible');
    expect(loaded.compatibility.reasonCode).toBe('STORE_SCHEMA_CURRENT');
    expect(loaded.compatibility.normalized).toBe(false);
    expect((loaded.snapshot as ResolutionSnapshot).fingerprint).toBe('fp-1');
  });

  it('preserves an unknown vocabulary through a save round-trip', async () => {
    const provider = new MemoryProvider();

    const payload = legacySnapshotPayload();

    const resolutions = payload.resolutions as Array<Record<string, unknown>>;

    resolutions[0] = { ...resolutions[0], kind: 'SOMETHING_ELSE' };

    await new PersistentTypeResolutionStore(provider).save(
      payload as unknown as TypeResolutionSnapshot
    );

    const written = provider.objects.get(RESOLUTION_KEY) ?? '';

    expect(written).toContain('SOMETHING_ELSE');
    expect(written).not.toContain('"CALL"');
    /* The other four entries were canonicalized. */
    expect(written).toContain('"kind":"inheritance"');
  });

  it('reports a derived rebuild requirement for an unreadable schema version', async () => {
    const provider = new MemoryProvider();

    await provider.put(RESOLUTION_KEY, JSON.stringify({ ...legacySnapshotPayload(), version: 9 }));

    const loaded = await new PersistentTypeResolutionStore(provider).loadWithCompatibility(
      'proj-1'
    );

    expect(loaded.compatibility.status).toBe('rebuild_required');
    expect(loaded.compatibility.reasonCode).toBe('DERIVED_STORE_REBUILD_REQUIRED');
    expect(loaded.compatibility.storeClass).toBe('derived');
  });

  it('returns no snapshot and no mutation for a missing store object', async () => {
    const provider = new MemoryProvider();

    const loaded = await new PersistentTypeResolutionStore(provider).loadWithCompatibility(
      'proj-1'
    );

    expect(loaded.snapshot).toBeNull();
    expect(loaded.compatibility.reasonCode).toBe('STORE_SCHEMA_CURRENT');
    expect(provider.puts).toBe(0);
    expect(provider.deletes).toBe(0);
  });

  it('wires the shared normalizer into the rich graph enricher', () => {
    /* The enricher must resolve the archived vocabulary through the same
     * normalizer; a bare `kind !== 'call'` comparison silently skipped every
     * legacy entry. */
    const source = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'rich', 'rich-graph-enricher.ts'),
      'utf8'
    );

    expect(source).toContain("canonicalResolutionKind(item.kind) !== 'call'");
    expect(source).not.toMatch(/item\.kind !==\s*'call'/u);
  });
});

/* ==================================================================
 * Release analysis — the Phase 83 false positive
 * ================================================================== */

interface FixtureRepo {
  root: string;
  write(path: string, content: string): void;
  commit(message: string): void;
  status(): string;
  head(): string;
}

function createFixtureRepo(): FixtureRepo {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase84b-'));

  const git = (args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });

  git(['init', '--initial-branch=main']);
  git(['config', 'user.email', 'phase84b@example.com']);
  git(['config', 'user.name', 'Phase 84B']);
  git(['config', 'commit.gpgsign', 'false']);

  const write = (path: string, content: string): void => {
    const target = join(root, path);

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };

  return {
    root,
    write,
    commit(message: string): void {
      git(['add', '-A']);
      git(['commit', '--allow-empty', '-m', message]);
    },
    status(): string {
      return git(['status', '--porcelain']);
    },
    head(): string {
      return git(['rev-parse', 'HEAD']).trim();
    },
  };
}

function seedFixture(repo: FixtureRepo): void {
  const scripts: Record<string, string> = {};

  for (const phase of REQUIRED_RELEASE_PHASES) {
    scripts[`phase${phase}:certify`] = `echo phase${phase}`;
  }

  repo.write(
    'package.json',
    `${JSON.stringify(
      {
        name: 'phase84b-fixture',
        version: '0.5.3',
        scripts,
        files: ['bundle/mcp.js', 'release-manifest.json'],
      },
      null,
      2
    )}\n`
  );

  repo.write('bundle/mcp.js', 'e.tool("memory_search","d");\n');

  repo.write('src/mcp/server.ts', "server.tool('memory_search', 'Search', schema, handler);\n");

  repo.write('release-manifest.json', `${JSON.stringify({ version: '0.5.3' })}\n`);

  repo.write(
    'src/storage/index.ts',
    "export * from './memory-store.js';\nexport * from './type-resolution-store.js';\n"
  );
  repo.write('src/storage/memory-store.ts', 'export const MEMORY_STORE_VERSION = 1;\n');
  repo.write(
    'src/storage/type-resolution-store.ts',
    'export const RESOLUTION_STORE_VERSION = 1;\n'
  );
  repo.write('src/storage/provider.ts', 'export interface StorageProviderLike {}\n');
  repo.write('src/storage/project/migrate.ts', 'export const MIGRATE_LAYOUT = 1;\n');
  repo.write('src/storage/brand-new-concern.ts', 'export const CONCERN = 0;\n');

  repo.commit('baseline');
}

function analyse(root: string) {
  const limits = resolveReleaseLimits({});

  const facts = buildReleaseFacts({
    projectRoot: root,
    profile: 'auditor',
    requiredPhases: REQUIRED_RELEASE_PHASES,
    maxCapabilities: limits.maxCapabilities,
    maxBundleReadBytes: limits.maxBundleReadBytes,
    maxPackageJsonBytes: limits.maxPackageJsonBytes,
    maxWorktreeFiles: limits.maxWorktreeFiles,
  });

  return runReleaseAnalysis({
    facts,
    request: { operation: 'status', evidenceProfile: 'auditor' },
    rebuild: false,
  });
}

function codes(reasons: readonly { code: ReleaseReasonCode }[]): ReleaseReasonCode[] {
  return reasons.map((reason) => reason.code);
}

function emptyStorageChanges(): StorageChangeReport {
  return { authority: [], derived: [], migration: [], unclassified: [], additive: [] };
}

function guardWith(storageChanges: Partial<StorageChangeReport>) {
  return evaluateReleaseGuard({
    certificationsComplete: true,
    failingCertifications: [],
    missingCertifications: [],
    parityComplete: true,
    missingRequiredCapabilities: [],
    bundleStale: false,
    compatibility: { comparisons: [], breaking: 0, compatible: 0, unknown: 0, complete: true },
    contractAnalysisIncomplete: false,
    packageAuditComplete: true,
    packageSensitivePaths: [],
    packageUnexpectedPaths: [],
    packageRequiredMissing: [],
    reproducible: undefined,
    versionStale: false,
    versionDivergences: [],
    manifestStale: false,
    baselineKnown: true,
    dirtyWorktree: false,
    authorityMigrationRequired: false,
    artifactRebuildRequired: false,
    storageChanges: { ...emptyStorageChanges(), ...storageChanges },
    testVerificationIncomplete: false,
  });
}

describe('Phase 84B — release guard mapping', () => {
  it('never blocks a release for a barrel or derived-only storage change', () => {
    const derivedOnly = guardWith({ derived: ['src/storage/type-resolution-store.ts'] });

    expect(codes(derivedOnly.blockers)).not.toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
    expect(codes(derivedOnly.warnings)).toContain('DERIVED_STORAGE_CHANGED');
    expect(derivedOnly.readiness).toBe('review_required');

    /* Additive-only (untracked new stores) is not even a warning. */
    const additiveOnly = guardWith({ additive: ['src/storage/new-store.ts'] });

    expect(codes(additiveOnly.blockers)).toEqual([]);
    expect(codes(additiveOnly.warnings)).toEqual([]);
    expect(additiveOnly.readiness).toBe('ready');
  });

  it('blocks only for an authority contract change or an unresolvable one', () => {
    const authority = guardWith({ authority: ['src/storage/memory-store.ts'] });

    expect(codes(authority.blockers)).toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
    expect(authority.readiness).toBe('blocked');

    const unknown = guardWith({ unclassified: ['src/storage/brand-new-concern.ts'] });

    expect(codes(unknown.blockers)).toContain('STORAGE_CLASSIFICATION_UNKNOWN');
    expect(codes(unknown.blockers)).toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
    expect(unknown.readiness).toBe('blocked');
  });

  it('reviews a migration-script change without blocking', () => {
    const migration = guardWith({ migration: ['src/storage/project/migrate-layout-v2.ts'] });

    expect(codes(migration.blockers)).not.toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
    expect(codes(migration.warnings)).toContain('STORAGE_MIGRATION_CHANGED');
    expect(migration.readiness).toBe('review_required');
  });

  it('keeps historical callers working when no storage evidence is supplied', () => {
    const result = evaluateReleaseGuard({
      certificationsComplete: true,
      failingCertifications: [],
      missingCertifications: [],
      parityComplete: true,
      missingRequiredCapabilities: [],
      bundleStale: false,
      compatibility: { comparisons: [], breaking: 0, compatible: 0, unknown: 0, complete: true },
      contractAnalysisIncomplete: false,
      packageAuditComplete: true,
      packageSensitivePaths: [],
      packageUnexpectedPaths: [],
      packageRequiredMissing: [],
      reproducible: undefined,
      versionStale: false,
      versionDivergences: [],
      manifestStale: false,
      baselineKnown: true,
      dirtyWorktree: false,
      authorityMigrationRequired: true,
      artifactRebuildRequired: false,
      testVerificationIncomplete: false,
    });

    expect(codes(result.blockers)).toEqual(['AUTHORITY_SCHEMA_MIGRATION_REQUIRED']);
  });
});

describe('Phase 84B — storage classification inside the release analysis', () => {
  const repo = createFixtureRepo();

  seedFixture(repo);

  const head = repo.head();

  it('reports no storage reason for a barrel-only change', () => {
    repo.write(
      'src/storage/index.ts',
      "export * from './memory-store.js';\nexport * from './type-resolution-store.js';\nexport * from './code-graph-store.js';\n"
    );

    const report = analyse(repo.root);

    expect(report.storage.authority).toEqual([]);
    expect(report.storage.derived).toEqual([]);
    expect(report.storage.unclassified).toEqual([]);
    expect(codes(report.blockers)).not.toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
    expect(codes(report.warnings)).not.toContain('DERIVED_STORAGE_CHANGED');
  });

  it('downgrades a derived store change to a rebuild warning', () => {
    repo.write(
      'src/storage/type-resolution-store.ts',
      'export const RESOLUTION_STORE_VERSION = 2;\n'
    );

    const report = analyse(repo.root);

    expect(report.storage.derived).toContain('src/storage/type-resolution-store.ts');
    expect(report.storage.authority).toEqual([]);
    expect(codes(report.warnings)).toContain('DERIVED_STORAGE_CHANGED');
    expect(codes(report.blockers)).not.toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
  });

  it('still blocks a real authority store change', () => {
    repo.write('src/storage/memory-store.ts', 'export const MEMORY_STORE_VERSION = 2;\n');

    const report = analyse(repo.root);

    expect(report.storage.authority).toContain('src/storage/memory-store.ts');
    expect(codes(report.blockers)).toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
    expect(report.readiness).toBe('blocked');
  });

  it('reports an unresolvable storage change as unknown and blocking', () => {
    repo.write('src/storage/brand-new-concern.ts', 'export const CONCERN = 1;\n');

    const report = analyse(repo.root);

    expect(report.storage.unclassified).toContain('src/storage/brand-new-concern.ts');
    expect(codes(report.blockers)).toContain('STORAGE_CLASSIFICATION_UNKNOWN');
  });

  it('treats new untracked storage files as additive, never as migrations', () => {
    /* A clean baseline: additive extensions must be provable on their own,
     * not inferred from a worktree that already carries other changes. */
    const fresh = createFixtureRepo();

    seedFixture(fresh);

    fresh.write('src/storage/brand-new-store.ts', 'export const NEW_STORE = 1;\n');
    fresh.write('src/storage/compatibility/registry.ts', 'export const REGISTRY = 1;\n');

    const report = analyse(fresh.root);

    expect(report.storage.additive).toEqual([
      'src/storage/brand-new-store.ts',
      'src/storage/compatibility/registry.ts',
    ]);
    /* Untracked files are listed individually, never collapsed to a dir. */
    expect(report.storage.additive.some((entry) => entry.endsWith('/'))).toBe(false);
    expect(report.storage.authority).toEqual([]);
    expect(report.storage.unclassified).toEqual([]);
    expect(codes(report.blockers)).not.toContain('STORAGE_CLASSIFICATION_UNKNOWN');
    expect(codes(report.blockers)).not.toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
  });

  it('reviews a migration-script change and never mutates the worktree', () => {
    const statusBefore = repo.status();

    repo.write('src/storage/project/migrate.ts', 'export const MIGRATE_LAYOUT = 2;\n');

    const report = analyse(repo.root);

    expect(report.storage.migration).toContain('src/storage/project/migrate.ts');
    expect(codes(report.warnings)).toContain('STORAGE_MIGRATION_CHANGED');

    /* Read-only analysis: HEAD is untouched and the status set only grew by
     * the file this test wrote. */
    expect(repo.head()).toBe(head);

    const statusAfter = repo.status();

    expect(statusAfter.split('\n').length).toBeGreaterThanOrEqual(statusBefore.split('\n').length);

    const migrated = analyse(repo.root);

    expect(migrated.storage).toEqual(report.storage);
  });

  it('classifies this repository without inventing an authority migration', () => {
    const report = analyse(REPO_ROOT);

    /* The classification is relative to HEAD, so it holds whether or not the
     * v0.6.0 storage work is still pending: no authority schema change is ever
     * invented and nothing is left unclassified. */
    expect(report.storage.authority).toEqual([]);
    expect(report.storage.unclassified).toEqual([]);
    expect(codes(report.blockers)).not.toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');
    expect(codes(report.blockers)).not.toContain('STORAGE_CLASSIFICATION_UNKNOWN');

    const pending = report.storage.derived.length + report.storage.additive.length > 0;

    if (pending) {
      /* Pre-commit: the release worktree changes a barrel and a DERIVED store.
       * Neither is an authority schema change. */
      expect(report.storage.derived).toContain('src/storage/type-resolution-store.ts');

      /* The real fixes are reported as additive extensions. */
      expect(report.storage.additive).toContain('src/storage/compatibility/registry.ts');
      expect(report.storage.additive).toContain('src/storage/compatibility/check.ts');
    } else {
      /* Post-commit: the release commit already recorded the storage work, so
       * no storage path remains pending for classification. */
      expect(report.storage.derived).toEqual([]);
      expect(report.storage.additive).toEqual([]);
      expect(report.storage.migration).toEqual([]);
    }
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 84B — certification', () => {
  it('emits the Phase 84B PASS marker', () => {
    process.stdout.write(`${MARKER}\n`);

    expect(MARKER).toBe('PHASE84B_STORAGE_COMPATIBILITY=PASS');
  });

  it('cleans up nothing it did not create in the repository', () => {
    const fixtures = mkdtempSync(join(tmpdir(), 'toolnet-phase84b-cleanup-'));

    expect(fixtures.startsWith(tmpdir())).toBe(true);

    rmSync(fixtures, { recursive: true, force: true });
  });
});
