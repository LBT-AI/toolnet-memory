import { FleetBuilder } from '../code-intelligence/fleet/fleet-builder.js';

import { FleetProjectRegistry } from '../code-intelligence/fleet/project-registry.js';

import { PersistentFleetStore } from '../code-intelligence/fleet/fleet-store.js';

import type { FleetProjectExport, FleetSnapshot } from '../code-intelligence/fleet/types.js';

import type { MCPContext } from './context.js';

export interface LoadFleetOptions {
  /** Persist the rebuilt snapshot/coverage (default: true). */
  persist?: boolean;
  /** Return the persisted snapshot instead of rebuilding. */
  cached?: boolean;
}

function fleetStorage(ctx: MCPContext) {
  return ctx.rootStorage ?? ctx.storage ?? null;
}

/**
 * Single central Fleet loader.
 *
 * Fleet state is derived: it is rebuilt from the registered projects' export
 * views. No MCP tool reads fleet JSON directly.
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
    const persisted = await store.loadSnapshot();
    ctx.fleet = persisted;
    return persisted;
  }

  const registry = new FleetProjectRegistry(storage);
  const projects = await registry.discover();

  const { snapshot } = new FleetBuilder().build({ projects });

  ctx.fleet = snapshot;

  if (options.persist ?? true) {
    try {
      await store.saveSnapshot(snapshot);
      await store.saveCoverage(snapshot.coverage);
    } catch {
      /* Derived state: persistence failure must not break the tool. */
    }
  }

  return snapshot;
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
