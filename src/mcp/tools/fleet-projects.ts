import { z } from 'zod';

import { inspectContextFleetState, loadFleetSnapshot, type FleetDataStatus } from '../fleet.js';

import type { MCPContext } from '../context.js';

export const fleetProjectsSchema = {
  /** Return the persisted snapshot instead of rebuilding from exports. */
  cached: z.boolean().optional(),
};

export interface FleetProjectEntry {
  projectId: string;
  name: string;
  remoteIdentity?: string;
  availability: string;
  generation: string;
  stale: boolean;
}

export interface FleetProjectsResult {
  scope: 'fleet';

  /**
   * Precise persisted Fleet state. `snapshot_missing` / `registry_empty` are
   * first-class states, never collapsed into a generic "unavailable".
   */
  state: FleetDataStatus;

  /** True when an explicit Fleet build is required before state is current. */
  buildRequired: boolean;

  generation: string;
  coverage: {
    status: string;
    negativeClaimSafe: boolean;
    reasons: string[];
  };
  projects: FleetProjectEntry[];
}

/**
 * Metadata only: never returns source contents, symbols or project internals.
 */
export async function fleetProjects(
  ctx: MCPContext,
  input: { cached?: boolean } = {}
): Promise<FleetProjectsResult> {
  /* Read-only: no implicit rebuild publication, no state mutation. */
  const snapshot = await loadFleetSnapshot(ctx, {
    cached: input.cached ?? false,
    persist: false,
  });

  const inspection = await inspectContextFleetState(ctx);

  if (!snapshot) {
    return {
      scope: 'fleet',
      state: inspection?.status ?? 'not_configured',
      buildRequired: inspection?.buildRequired ?? false,
      generation: '',
      coverage: {
        status: 'unavailable',
        negativeClaimSafe: false,
        reasons: inspection?.reasons.length ? inspection.reasons : ['FLEET_EMPTY'],
      },
      projects: [],
    };
  }

  return {
    scope: 'fleet',
    state: inspection?.status ?? 'current',
    buildRequired: inspection?.buildRequired ?? false,
    generation: snapshot.generation,
    coverage: {
      status: snapshot.coverage.status,
      negativeClaimSafe: snapshot.coverage.negativeClaimSafe,
      reasons: inspection?.reasons.length ? inspection.reasons : snapshot.coverage.reasons,
    },
    projects: snapshot.projects.map((project) => ({
      projectId: project.projectId,
      name: project.name,
      ...(project.remoteIdentity ? { remoteIdentity: project.remoteIdentity } : {}),
      availability: project.availability,
      generation: project.graphGeneration,
      stale: project.stale,
    })),
  };
}
