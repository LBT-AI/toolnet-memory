import { FleetBuilder } from '../code-intelligence/fleet/fleet-builder.js';

import { FleetProjectRegistry } from '../code-intelligence/fleet/project-registry.js';

import { PersistentFleetStore } from '../code-intelligence/fleet/fleet-store.js';

import type { FleetProjectExport, FleetSnapshot } from '../code-intelligence/fleet/types.js';

import type { MCPContext } from './context.js';

export interface LoadFleetOptions {
  /**
   * Publish the rebuilt snapshot + coverage.
   *
   * Default false: Phase 86E removed the implicit write. Every read-only Fleet
   * tool (fleet_projects, fleet_status, fleet queries, impact) reads or derives
   * in memory; publishing requires an explicit build.
   */
  persist?: boolean;
  /** Return the persisted snapshot instead of rebuilding. */
  cached?: boolean;
}

function fleetStorage(ctx: MCPContext) {
  return ctx.rootStorage ?? ctx.storage ?? null;
}

/**
 * Phase 86E Fleet data status vocabulary.
 *
 * A registered project without a snapshot is `snapshot_missing` — never a
 * generic "unavailable". Registry and snapshot are separate concepts and the
 * status surface must say which one is actually missing.
 */
export type FleetDataStatus =
  | 'not_configured'
  | 'registry_empty'
  | 'registry_corrupt'
  | 'registry_unsupported'
  | 'snapshot_missing'
  | 'snapshot_corrupt'
  | 'snapshot_unsupported'
  | 'snapshot_stale'
  | 'current';

export interface FleetDataInspection {
  status: FleetDataStatus;

  buildRequired: boolean;

  registeredProjects: number;

  registeredProjectIds: string[];

  unregisteredProjects: number;

  generation?: string;

  indexedAt?: string;

  coverageStatus?: string;

  coverageGeneration?: string;

  coverageGenerationMatches: boolean;

  negativeClaimSafe: boolean;

  incompleteCoverage: boolean;

  missingProjects: string[];

  staleProjects: string[];

  reasons: string[];

  registryState: 'absent' | 'current' | 'corrupt' | 'unsupported_schema';

  snapshotState: 'missing' | 'current' | 'corrupt' | 'unsupported_schema';

  coverageState: 'missing' | 'current' | 'corrupt';
}

/**
 * Pure Fleet state inspection.
 *
 * Reads the registry, the persisted snapshot and the persisted coverage and
 * classifies the exact state. Never builds, never writes, never touches a
 * project graph.
 */
export async function inspectFleetState(
  storage: NonNullable<ReturnType<typeof fleetStorage>>
): Promise<FleetDataInspection> {
  const store = new PersistentFleetStore(storage);

  const registry = new FleetProjectRegistry(storage);

  const [registryState, snapshotState, coverageState] = await Promise.all([
    store.readRegistryState(),
    store.readSnapshotState(),
    store.readCoverageState(),
  ]);

  const registeredProjectIds =
    registryState.status === 'current'
      ? registryState.registry.projects.map((entry) => entry.projectId)
      : [];

  /* Never silently promote unregistered folders into the registered Fleet. */
  let unregisteredProjects = 0;

  try {
    unregisteredProjects = (await registry.unregisteredFolders()).length;
  } catch {
    unregisteredProjects = 0;
  }

  const snapshot = snapshotState.status === 'current' ? snapshotState.snapshot : undefined;

  const snapshotGeneration = snapshot?.generation;

  const coverageGeneration =
    coverageState.status === 'current' ? coverageState.coverage.generation : undefined;

  const coverageGenerationMatches =
    snapshotGeneration !== undefined &&
    coverageGeneration !== undefined &&
    coverageGeneration === snapshotGeneration;

  const reasons: string[] = [];

  if (registryState.status === 'corrupt') {
    reasons.push('FLEET_REGISTRY_CORRUPT');
  }

  if (registryState.status === 'unsupported_schema') {
    reasons.push('FLEET_SCHEMA_UNSUPPORTED');
  }

  if (snapshotState.status === 'corrupt') {
    reasons.push('FLEET_SNAPSHOT_CORRUPT');
  }

  if (snapshotState.status === 'unsupported_schema') {
    reasons.push('FLEET_SCHEMA_UNSUPPORTED');
  }

  if (coverageState.status === 'corrupt') {
    reasons.push('FLEET_COVERAGE_CORRUPT');
  }

  /* Phase 86E staleness: a pinned generation that no longer matches the
   * snapshot's recorded graph generation means the snapshot is behind the
   * project exports. Deterministic — no timestamps involved. */
  let pinnedDrift = false;

  if (snapshot && registryState.status === 'current') {
    for (const entry of registryState.registry.projects) {
      if (!entry.pinnedGeneration) {
        continue;
      }

      const reference = snapshot.projects.find((item) => item.projectId === entry.projectId);

      if (reference && reference.graphGeneration !== entry.pinnedGeneration) {
        pinnedDrift = true;

        break;
      }
    }
  }

  const staleProjects = snapshot?.coverage.staleProjects ?? [];

  const missingProjects = snapshot?.coverage.missingProjects ?? [];

  let status: FleetDataStatus;

  let buildRequired = false;

  if (registryState.status === 'corrupt') {
    status = 'registry_corrupt';
  } else if (registryState.status === 'unsupported_schema') {
    status = 'registry_unsupported';
  } else if (registryState.status === 'absent' && snapshotState.status === 'missing') {
    status = 'not_configured';
  } else if (registeredProjectIds.length === 0 && snapshotState.status === 'missing') {
    status = 'registry_empty';
  } else if (snapshotState.status === 'corrupt') {
    status = 'snapshot_corrupt';

    buildRequired = true;
  } else if (snapshotState.status === 'unsupported_schema') {
    status = 'snapshot_unsupported';
  } else if (snapshotState.status === 'missing') {
    status = 'snapshot_missing';

    buildRequired = true;
  } else if (
    coverageState.status !== 'current' ||
    !coverageGenerationMatches ||
    staleProjects.length > 0 ||
    pinnedDrift
  ) {
    status = 'snapshot_stale';

    buildRequired = true;

    if (coverageState.status !== 'current') {
      reasons.push('FLEET_COVERAGE_MISSING');
    }

    if (coverageState.status === 'current' && !coverageGenerationMatches) {
      reasons.push('FLEET_COVERAGE_GENERATION_MISMATCH');
    }

    if (staleProjects.length > 0) {
      reasons.push('FLEET_PROJECT_STALE');
    }

    if (pinnedDrift) {
      reasons.push('FLEET_PINNED_GENERATION_DRIFT');
    }
  } else {
    status = 'current';
  }

  if (missingProjects.length > 0) {
    reasons.push('FLEET_PROJECT_UNAVAILABLE');
  }

  return {
    status,
    buildRequired,
    registeredProjects: registeredProjectIds.length,
    registeredProjectIds,
    unregisteredProjects,
    ...(snapshotGeneration ? { generation: snapshotGeneration } : {}),
    ...(snapshot?.indexedAt ? { indexedAt: snapshot.indexedAt } : {}),
    ...(snapshot?.coverage.status ? { coverageStatus: snapshot.coverage.status } : {}),
    ...(coverageGeneration ? { coverageGeneration } : {}),
    coverageGenerationMatches,
    negativeClaimSafe: snapshot?.coverage.negativeClaimSafe ?? false,
    incompleteCoverage: (snapshot?.coverage.status ?? 'incomplete') !== 'complete',
    missingProjects,
    staleProjects,
    reasons,
    registryState: registryState.status,
    snapshotState: snapshotState.status,
    coverageState: coverageState.status,
  };
}

/** Convenience wrapper: inspect the Fleet state reachable from a context. */
export async function inspectContextFleetState(
  ctx: MCPContext
): Promise<FleetDataInspection | undefined> {
  const storage = fleetStorage(ctx);

  return storage ? inspectFleetState(storage) : undefined;
}

/**
 * Single central Fleet loader.
 *
 * Phase 86E: this is pure unless `persist` is explicitly true. The snapshot is
 * derived state — it is rebuilt in memory for reads, and only an explicit build
 * publishes it.
 */
export async function loadFleetSnapshot(
  ctx: MCPContext,
  options: LoadFleetOptions = {}
): Promise<FleetSnapshot | null> {
  const storage = fleetStorage(ctx);

  if (!storage) {
    return ctx.fleet ?? null;
  }

  const store = new PersistentFleetStore(storage);

  if (options.cached) {
    const snapshot = await store.loadSnapshot();

    ctx.fleet = snapshot;

    return snapshot;
  }

  const registry = new FleetProjectRegistry(storage);
  const projects = await registry.discover();

  const { snapshot } = new FleetBuilder().build({ projects });

  ctx.fleet = snapshot;

  if (options.persist ?? false) {
    await publishFleetSnapshot(storage, snapshot);
  }

  return snapshot;
}

/**
 * Explicit Fleet publication.
 *
 * Snapshot first, then coverage stamped with that snapshot's generation. A
 * reader can therefore never treat the previous coverage as current for the new
 * snapshot: `inspectFleetState` reports the mismatched pair as `snapshot_stale`.
 */
export async function publishFleetSnapshot(
  storage: NonNullable<ReturnType<typeof fleetStorage>>,
  snapshot: FleetSnapshot
): Promise<void> {
  const store = new PersistentFleetStore(storage);

  await store.saveSnapshot(snapshot);

  await store.saveCoverage({ ...snapshot.coverage, generation: snapshot.generation });
}

/**
 * Persisted graph generation for the current project, when the project has
 * been indexed with Fleet export enabled. Used as the query-generation pin so
 * a cursor can never span two graph generations.
 */
export async function loadProjectGeneration(ctx: MCPContext): Promise<string | undefined> {
  const storage = fleetStorage(ctx);
  if (!storage) {
    return undefined;
  }

  const registry = new FleetProjectRegistry(storage);

  let folders: Awaited<ReturnType<FleetProjectRegistry['listRegisteredFolders']>> = [];

  try {
    folders = await registry.listRegisteredFolders();
  } catch {
    return undefined;
  }

  const match = folders.find((folder) => folder.manifest.id === ctx.project.id);
  if (!match) {
    return undefined;
  }

  try {
    return (await registry.loadExport(match.folder))?.generation;
  } catch {
    return undefined;
  }
}

export interface FleetQueryData {
  snapshot: FleetSnapshot | null;
  /** Sanitized per-project export views, keyed by projectId. */
  exports: Map<string, FleetProjectExport>;
  /** Current project's persisted graph generation, when available. */
  projectGeneration?: string;
}

/**
 * Data needed by a `scope: "fleet"` query.
 *
 * Only sanitized export views are read — never a remote project's internal
 * graph — so project isolation is preserved.
 */
export async function loadFleetQueryData(ctx: MCPContext): Promise<FleetQueryData> {
  const storage = fleetStorage(ctx);
  const snapshot = await loadFleetSnapshot(ctx, { persist: false });
  const exports = new Map<string, FleetProjectExport>();

  if (!storage) {
    return { snapshot, exports };
  }

  const registry = new FleetProjectRegistry(storage);

  let folders: Awaited<ReturnType<FleetProjectRegistry['listRegisteredFolders']>> = [];

  try {
    folders = await registry.listRegisteredFolders();
  } catch {
    folders = [];
  }

  for (const { folder, manifest } of folders) {
    try {
      const view = await registry.loadExport(folder);
      if (view) {
        exports.set(manifest.id, view);
      }
    } catch {
      /* Derived state: a broken export must not break the query. */
    }
  }

  const projectGeneration = exports.get(ctx.project.id)?.generation;

  return {
    snapshot,
    exports,
    ...(projectGeneration ? { projectGeneration } : {}),
  };
}
