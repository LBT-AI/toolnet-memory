import { describe, expect, it } from 'vitest';

import {
  FleetBuilder,
  FleetProjectRegistry,
  PersistentFleetStore,
  isFleetStateError,
} from '../../src/code-intelligence/fleet/index.js';

import { FLEET_SCHEMA_VERSION } from '../../src/code-intelligence/fleet/types.js';

import type { FleetProjectExport } from '../../src/code-intelligence/fleet/types.js';

import { inspectFleetState, loadFleetSnapshot, publishFleetSnapshot } from '../../src/mcp/fleet.js';

import { fleetProjects } from '../../src/mcp/tools/fleet-projects.js';

import { fleetStatus } from '../../src/mcp/tools/fleet-status.js';

import { runFleetBuild } from '../../src/production/fleet-build.js';

import type { MCPContext } from '../../src/mcp/context.js';

import type { StorageProvider, StorageObject } from '../../src/storage/types.js';

const REGISTRY_KEY = 'fleet/registry.json';
const SNAPSHOT_KEY = 'fleet/graph/current.json';
const COVERAGE_KEY = 'fleet/coverage.json';

class MemStorage implements StorageProvider {
  readonly name = 'phase86e-fleet';

  readonly objects = new Map<string, string>();

  readonly writes: string[] = [];

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.writes.push(key);
    this.objects.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.objects.get(key);
    return value ? Buffer.from(value) : null;
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
      .map((key) => ({ key, size: 0 }));
  }

  snapshot(): string {
    return JSON.stringify(
      [...this.objects.entries()].sort(([left], [right]) => left.localeCompare(right))
    );
  }
}

function exportView(
  projectId: string,
  name = projectId,
  generation = `gen-${projectId}`
): FleetProjectExport {
  return {
    version: FLEET_SCHEMA_VERSION,
    projectId,
    name,
    generation,
    graphFingerprint: `fp-${projectId}`,
    indexedAt: '2026-10-01T00:00:00.000Z',
    crossServiceComplete: true,
    identities: [name],
    services: [{ id: `${projectId}-svc`, name, rootPath: '.', kind: 'backend' }],
    endpoints: [],
    outboundCalls: [],
    events: [],
    packages: [],
    packageDependencies: [],
  };
}

async function seedProject(
  storage: MemStorage,
  projectId: string,
  view: FleetProjectExport | null
): Promise<void> {
  storage.objects.set(
    `projects/${projectId}/project.json`,
    JSON.stringify({ version: 1, id: projectId, name: projectId, remote: projectId })
  );

  if (view) {
    storage.objects.set(`projects/${projectId}/code/graph/fleet-export.json`, JSON.stringify(view));
  }
}

async function registerAndSeed(
  storage: MemStorage,
  ids: Array<{ id: string; export: FleetProjectExport | null }>
): Promise<void> {
  const registry = new FleetProjectRegistry(storage);

  for (const { id, export: view } of ids) {
    await seedProject(storage, id, view);
    await registry.register({ projectId: id, name: id, remote: id });
  }
}

function context(storage: MemStorage): MCPContext {
  return {
    project: {
      id: 'p-a',
      name: 'p-a',
      rootPath: '/tmp/p-a',
      remote: 'p-a',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      graphVersion: 0,
      memoryVersion: 0,
    },
    memory: {} as never,
    retrieval: {} as never,
    graph: {} as never,
    references: {} as never,
    rootStorage: storage,
  } as unknown as MCPContext;
}

describe('Phase 86E — Fleet state recovery', () => {
  it('F1: no registry is not-configured, never fake corruption', async () => {
    const storage = new MemStorage();

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).toBe('not_configured');
    expect(inspection.registryState).toBe('absent');
    expect(inspection.snapshotState).toBe('missing');
    expect(inspection.reasons).toEqual([]);

    const registry = await new PersistentFleetStore(storage).loadRegistry();

    expect(registry.projects).toEqual([]);
  });

  it('F2: a registry with no projects is a valid empty Fleet', async () => {
    const storage = new MemStorage();

    storage.objects.set(
      REGISTRY_KEY,
      JSON.stringify({ version: 1, updatedAt: '2026-10-01T00:00:00.000Z', projects: [] })
    );

    const inspection = await inspectFleetState(storage);

    expect(inspection.registryState).toBe('current');
    expect(inspection.status).toBe('registry_empty');
    expect(inspection.buildRequired).toBe(false);
  });

  it('F3: a registered project without a snapshot is snapshot_missing, not unavailable', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [{ id: 'p-a', export: exportView('p-a') }]);

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).toBe('snapshot_missing');
    expect(inspection.buildRequired).toBe(true);
    expect(inspection.registeredProjects).toBe(1);

    const result = await fleetProjects(context(storage), {});

    expect(result.state).toBe('snapshot_missing');
    expect(result.buildRequired).toBe(true);
    /* Any projects listed here are derived in memory; the precise persisted
     * state remains snapshot_missing until an explicit build publishes it. */
    expect(result.coverage.status).not.toBe('current');
  });

  it('F4: a published snapshot is current and fleet_projects lists the projects', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [
      { id: 'p-a', export: exportView('p-a') },
      { id: 'p-b', export: exportView('p-b') },
    ]);

    const snapshot = await loadFleetSnapshot(context(storage), { persist: false });

    expect(snapshot).not.toBeNull();

    await publishFleetSnapshot(storage, snapshot!);

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).toBe('current');
    expect(inspection.coverageGenerationMatches).toBe(true);

    const projects = await fleetProjects(context(storage), {});

    expect(projects.projects.map((project) => project.projectId).sort()).toEqual(['p-a', 'p-b']);
  });

  it('F5: a corrupt snapshot is an explicit error, not a silent rebuild', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [{ id: 'p-a', export: exportView('p-a') }]);

    storage.objects.set(SNAPSHOT_KEY, '{ corrupt snapshot');

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).toBe('snapshot_corrupt');
    expect(inspection.reasons).toContain('FLEET_SNAPSHOT_CORRUPT');

    await expect(new PersistentFleetStore(storage).loadSnapshot()).rejects.toSatisfy(
      (error: unknown) => isFleetStateError(error) && error.code === 'FLEET_SNAPSHOT_CORRUPT'
    );
  });

  it('F6: missing coverage does not make a valid snapshot corrupt', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [{ id: 'p-a', export: exportView('p-a') }]);

    const snapshot = (await loadFleetSnapshot(context(storage), { persist: false }))!;

    await new PersistentFleetStore(storage).saveSnapshot(snapshot);

    const inspection = await inspectFleetState(storage);

    expect(inspection.snapshotState).toBe('current');
    expect(inspection.status).toBe('snapshot_stale');
    expect(inspection.reasons).toContain('FLEET_COVERAGE_MISSING');
  });

  it('F7: coverage for a different snapshot generation is stale, deterministically', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [{ id: 'p-a', export: exportView('p-a') }]);

    const snapshot = (await loadFleetSnapshot(context(storage), { persist: false }))!;

    await new PersistentFleetStore(storage).saveSnapshot(snapshot);
    await new PersistentFleetStore(storage).saveCoverage({
      ...snapshot.coverage,
      generation: 'some-other-generation',
    });

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).toBe('snapshot_stale');
    expect(inspection.coverageGenerationMatches).toBe(false);
    expect(inspection.reasons).toContain('FLEET_COVERAGE_GENERATION_MISMATCH');
  });

  it('F8: a registry written without an explicit version stays readable', async () => {
    const storage = new MemStorage();

    storage.objects.set(
      REGISTRY_KEY,
      JSON.stringify({
        updatedAt: '2026-10-01T00:00:00.000Z',
        projects: [
          {
            projectId: 'p-a',
            name: 'p-a',
            registeredAt: '2026-10-01T00:00:00.000Z',
          },
        ],
      })
    );

    const state = await new PersistentFleetStore(storage).readRegistryState();

    expect(state.status).toBe('current');
  });

  it('F9: a future Fleet schema is never overwritten', async () => {
    const storage = new MemStorage();

    const registry = JSON.stringify({
      version: FLEET_SCHEMA_VERSION + 1,
      updatedAt: '2026-10-01T00:00:00.000Z',
      projects: [],
    });

    storage.objects.set(REGISTRY_KEY, registry);
    storage.objects.set(SNAPSHOT_KEY, '{ "version": 99 }');

    const before = storage.snapshot();

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).toBe('registry_unsupported');
    expect(inspection.reasons).toContain('FLEET_SCHEMA_UNSUPPORTED');
    expect(storage.snapshot()).toBe(before);

    await expect(new PersistentFleetStore(storage).loadRegistry()).rejects.toSatisfy(
      (error: unknown) => isFleetStateError(error) && error.code === 'FLEET_SCHEMA_UNSUPPORTED'
    );

    expect(storage.snapshot()).toBe(before);
  });

  it('F10: a physical folder whose manifest differs from the registry is reported, not merged', async () => {
    const storage = new MemStorage();

    /* Registry claims p-a, but the only physical manifest is p-b. */
    storage.objects.set(
      REGISTRY_KEY,
      JSON.stringify({
        version: FLEET_SCHEMA_VERSION,
        updatedAt: '2026-10-01T00:00:00.000Z',
        projects: [
          {
            projectId: 'p-a',
            name: 'p-a',
            remote: 'p-a',
            registeredAt: '2026-10-01T00:00:00.000Z',
          },
        ],
      })
    );

    await seedProject(storage, 'p-b', exportView('p-b'));

    const registry = new FleetProjectRegistry(storage);

    const discovered = await registry.discover();

    expect(discovered.map((item) => item.projectId)).toEqual(['p-a']);
    expect(discovered[0].export).toBeNull();

    expect(await registry.unregisteredFolders()).toEqual(['p-b']);
  });

  it('F11: an explicit rebuild produces a deterministic, generation-linked publish', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [
      { id: 'p-a', export: exportView('p-a') },
      { id: 'p-b', export: exportView('p-b') },
    ]);

    const report = await runFleetBuild(storage);

    expect(report.published).toBe(true);
    expect(report.statusAfter).toBe('current');

    const inspection = await inspectFleetState(storage);

    expect(inspection.coverageGenerationMatches).toBe(true);
    expect(inspection.generation).toBe(report.generation);

    const coverageText = storage.objects.get(COVERAGE_KEY)!;

    expect(JSON.parse(coverageText).generation).toBe(report.generation);
  });

  it('F12: a second rebuild is idempotent — no destructive churn', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [
      { id: 'p-a', export: exportView('p-a') },
      { id: 'p-b', export: exportView('p-b') },
    ]);

    const first = await runFleetBuild(storage);

    const coverageAfterFirst = storage.objects.get(COVERAGE_KEY);
    const keysAfterFirst = [...storage.objects.keys()].sort();

    const second = await runFleetBuild(storage);

    /* Same inputs produce the same logical snapshot: identical generation,
     * fingerprint and generation-linked coverage. Only the build timestamp
     * (`indexedAt`) differs, and no file is lost or added. */
    expect(second.generation).toBe(first.generation);
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(storage.objects.get(COVERAGE_KEY)).toBe(coverageAfterFirst);
    expect([...storage.objects.keys()].sort()).toEqual(keysAfterFirst);

    const persisted = capturedSnapshot(storage)!;

    expect(persisted.generation).toBe(first.generation);
    expect(persisted.fingerprint).toBe(first.fingerprint);
  });

  it('concurrent builds never publish a partial pair and converge', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [{ id: 'p-a', export: exportView('p-a') }]);

    const [a, b] = await Promise.all([runFleetBuild(storage), runFleetBuild(storage)]);

    expect(a.published).toBe(true);
    expect(b.published).toBe(true);

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).toBe('current');
    expect(inspection.coverageGenerationMatches).toBe(true);
  });

  it('a snapshot published without its coverage is never read as current', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [{ id: 'p-a', export: exportView('p-a') }]);

    const snapshot = (await loadFleetSnapshot(context(storage), { persist: false }))!;

    /* Crash window: snapshot lands, coverage publish does not. */
    await new PersistentFleetStore(storage).saveSnapshot(snapshot);

    const inspection = await inspectFleetState(storage);

    expect(inspection.status).not.toBe('current');
    expect(inspection.status).toBe('snapshot_stale');
  });

  it('read-only Fleet tools never write', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [{ id: 'p-a', export: exportView('p-a') }]);

    await runFleetBuild(storage);

    const before = storage.snapshot();

    await inspectFleetState(storage);
    await fleetProjects(context(storage), {});
    await fleetStatus(context(storage), {});
    await loadFleetSnapshot(context(storage), { persist: false });

    expect(storage.snapshot()).toBe(before);
  });

  it('never makes a negative claim when coverage is incomplete', async () => {
    const storage = new MemStorage();

    await registerAndSeed(storage, [
      { id: 'p-a', export: exportView('p-a') },
      { id: 'p-b', export: null },
    ]);

    const report = await runFleetBuild(storage);

    expect(report.coverage.status).not.toBe('complete');
    expect(report.coverage.negativeClaimSafe).toBe(false);

    const projects = await fleetProjects(context(storage), {});

    expect(projects.coverage.negativeClaimSafe).toBe(false);
    expect(projects.coverage.reasons).toContain('FLEET_PROJECT_UNAVAILABLE');
  });

  it('builds a large synthetic fleet deterministically', async () => {
    const storage = new MemStorage();

    const size = 40;

    const seeded = Array.from({ length: size }, (_, index) => {
      const id = `p-${String(index).padStart(3, '0')}`;
      return { id, export: exportView(id) };
    });

    await registerAndSeed(storage, seeded);

    const first = await runFleetBuild(storage);
    const second = await runFleetBuild(storage);

    expect(first.registeredProjects).toBe(size);
    expect(capturedSnapshot(storage)?.stats.registeredProjects).toBe(size);
    expect(second.generation).toBe(first.generation);
  });

  it('builds a nicer deterministic Fleet even when organized by folders', () => {
    /* Sanity: the builder is deterministic for identical inputs. */
    const projects = [
      { projectId: 'p-b', name: 'p-b', export: exportView('p-b') },
      { projectId: 'p-a', name: 'p-a', export: exportView('p-a') },
    ];

    const one = new FleetBuilder().build({ projects });
    const two = new FleetBuilder().build({ projects });

    expect(one.snapshot.generation).toBe(two.snapshot.generation);
    expect(one.snapshot.fingerprint).toBe(two.snapshot.fingerprint);
  });
});

function capturedSnapshot(storage: MemStorage) {
  const text = storage.objects.get(SNAPSHOT_KEY);
  return text ? JSON.parse(text) : null;
}
