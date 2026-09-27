import { z } from 'zod';

import {
  summarizeFleetArchitecture,
  summarizeFleetDiagnostics,
} from '../../code-intelligence/fleet/diagnostics.js';

import type { FleetSnapshot } from '../../code-intelligence/fleet/types.js';

import { loadFleetSnapshot } from '../fleet.js';

import type { MCPContext } from '../context.js';

export const fleetStatusSchema = {
  /** Return the persisted snapshot instead of rebuilding from exports. */
  cached: z.boolean().optional(),
  /** Include the bounded diagnostics summary. */
  includeDiagnostics: z.boolean().optional(),
  /** Include the deterministic fleet architecture summary. */
  includeArchitecture: z.boolean().optional(),
};

export interface FleetStatusResult {
  scope: 'fleet';
  generation: string;
  fingerprint: string;
  registeredProjects: number;
  availableProjects: number;
  staleProjects: number;
  missingProjects: string[];
  crossProjectEdges: number;
  crossProjectEdgesByType: Record<string, number>;
  unresolved: number;
  coverage: FleetSnapshot['coverage'] | null;
  diagnostics?: ReturnType<typeof summarizeFleetDiagnostics>;
  architecture?: ReturnType<typeof summarizeFleetArchitecture>;
}

export async function fleetStatus(
  ctx: MCPContext,
  input: {
    cached?: boolean;
    includeDiagnostics?: boolean;
    includeArchitecture?: boolean;
  } = {}
): Promise<FleetStatusResult> {
  const snapshot = await loadFleetSnapshot(ctx, {
    cached: input.cached ?? false,
    persist: true,
  });

  if (!snapshot) {
    return {
      scope: 'fleet',
      generation: '',
      fingerprint: '',
      registeredProjects: 0,
      availableProjects: 0,
      staleProjects: 0,
      missingProjects: [],
      crossProjectEdges: 0,
      crossProjectEdgesByType: {},
      unresolved: 0,
      coverage: {
        status: 'unavailable',
        negativeClaimSafe: false,
        reasons: ['FLEET_EMPTY'],
        projects: [],
        missingProjects: [],
        staleProjects: [],
      },
    };
  }

  const result: FleetStatusResult = {
    scope: 'fleet',
    generation: snapshot.generation,
    fingerprint: snapshot.fingerprint,
    registeredProjects: snapshot.stats.registeredProjects,
    availableProjects: snapshot.stats.availableProjects,
    staleProjects: snapshot.stats.staleProjects,
    missingProjects: snapshot.coverage.missingProjects,
    crossProjectEdges: snapshot.stats.crossProjectEdges,
    crossProjectEdgesByType: snapshot.stats.crossProjectEdgesByType,
    unresolved: snapshot.stats.unresolved,
    coverage: snapshot.coverage,
  };

  if (input.includeDiagnostics) {
    result.diagnostics = summarizeFleetDiagnostics(snapshot);
  }

  if (input.includeArchitecture) {
    result.architecture = summarizeFleetArchitecture(snapshot);
  }

  return result;
}
