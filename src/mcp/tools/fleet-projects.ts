import { z } from 'zod';

import { loadFleetSnapshot } from '../fleet.js';

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
  const snapshot = await loadFleetSnapshot(ctx, {
    cached: input.cached ?? false,
    persist: true,
  });

  if (!snapshot) {
    return {
      scope: 'fleet',
      generation: '',
      coverage: { status: 'unavailable', negativeClaimSafe: false, reasons: ['FLEET_EMPTY'] },
      projects: [],
    };
  }

  return {
    scope: 'fleet',
    generation: snapshot.generation,
    coverage: {
      status: snapshot.coverage.status,
      negativeClaimSafe: snapshot.coverage.negativeClaimSafe,
      reasons: snapshot.coverage.reasons,
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
