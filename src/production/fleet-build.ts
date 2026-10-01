/**
 * ToolNet Fleet build (pure logic).
 *
 * Phase 86E: publishing Fleet state is an EXPLICIT lifecycle action. The
 * snapshot is derived state — it is rebuilt from the registered projects'
 * export views, and nothing is published unless the build completes.
 */

import { FleetBuilder } from '../code-intelligence/fleet/fleet-builder.js';
import { FleetProjectRegistry } from '../code-intelligence/fleet/project-registry.js';
import type { StorageProvider } from '../storage/types.js';
import { inspectFleetState, publishFleetSnapshot, type FleetDataStatus } from '../mcp/fleet.js';

export interface FleetBuildReport {
  schema: 'toolnet.fleet-build.v1';
  dryRun: boolean;
  /** Persisted Fleet state before the build. */
  statusBefore: FleetDataStatus;
  /** Persisted Fleet state after the build (unchanged for a dry run). */
  statusAfter: FleetDataStatus;
  buildRequired: boolean;
  built: boolean;
  published: boolean;
  generation: string;
  fingerprint: string;
  registeredProjects: number;
  unregisteredProjects: number;
  availableProjects: number;
  staleProjectsCount: number;
  missingProjects: string[];
  staleProjects: string[];
  coverage: {
    status: string;
    negativeClaimSafe: boolean;
    generation?: string;
    projects: string[];
  };
  reasons: string[];
  actions: string[];
}

export interface FleetBuildOptions {
  dryRun?: boolean;
  /** Abort instead of publishing when coverage is incomplete. */
  requireCompleteCoverage?: boolean;
}

/**
 * Build (and optionally publish) the Fleet snapshot.
 *
 * The snapshot is derived state: it is rebuilt from the registered projects'
 * export views. Nothing is published unless the build completes, and a partial
 * build is reported through coverage instead of being hidden.
 */
export async function runFleetBuild(
  storage: StorageProvider,
  options: FleetBuildOptions = {}
): Promise<FleetBuildReport> {
  const before = await inspectFleetState(storage);

  const registry = new FleetProjectRegistry(storage);

  const projects = await registry.discover();

  const unregistered = await registry.unregisteredFolders().catch(() => []);

  const { snapshot, staleProjects, missingProjects } = new FleetBuilder().build({ projects });

  const actions: string[] = [];

  actions.push(`resolve-registered-projects:${String(snapshot.stats.registeredProjects)}`);

  if (missingProjects.length > 0) {
    actions.push(`coverage-missing-projects:${missingProjects.length}`);
  }

  if (staleProjects.length > 0) {
    actions.push(`coverage-stale-projects:${staleProjects.length}`);
  }

  const base = {
    schema: 'toolnet.fleet-build.v1' as const,
    dryRun: options.dryRun ?? false,
    statusBefore: before.status,
    buildRequired: before.buildRequired,
    generation: snapshot.generation,
    fingerprint: snapshot.fingerprint,
    registeredProjects: snapshot.stats.registeredProjects,
    unregisteredProjects: unregistered.length,
    availableProjects: snapshot.stats.availableProjects,
    staleProjectsCount: snapshot.stats.staleProjects,
    missingProjects,
    staleProjects,
    coverage: {
      status: snapshot.coverage.status,
      negativeClaimSafe: snapshot.coverage.negativeClaimSafe,
      generation: snapshot.generation,
      projects: snapshot.coverage.projects,
    },
    reasons: before.reasons,
  };

  if (options.dryRun) {
    actions.push('planned-publish: fleet/graph/current.json');
    actions.push('planned-publish: fleet/coverage.json');

    return { ...base, statusAfter: before.status, built: true, published: false, actions };
  }

  /*
   * A partial Fleet is published with explicit coverage rather than silently
   * omitted — unless the operator asked for a strict full-coverage build.
   */
  if (options.requireCompleteCoverage && snapshot.coverage.status !== 'complete') {
    actions.push('aborted-incomplete-coverage');

    return {
      ...base,
      statusAfter: before.status,
      built: true,
      published: false,
      actions,
    };
  }

  await publishFleetSnapshot(storage, snapshot);

  actions.push('published-snapshot');
  actions.push('published-coverage');

  const after = await inspectFleetState(storage);

  return { ...base, statusAfter: after.status, built: true, published: true, actions };
}
