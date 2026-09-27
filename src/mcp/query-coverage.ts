/*
 * Phase 74 — Query coverage derivation.
 *
 * A query result carries the trust it actually depends on: the capabilities of
 * the edge types it touches, plus Fleet coverage when cross-project edges are
 * involved. Lexical coverage is never used to justify a structural or
 * cross-repo conclusion.
 */

import type { FleetSnapshot } from '../code-intelligence/fleet/types.js';

import type {
  GraphCapability,
  GraphCoverageStatus,
} from '../code-intelligence/graph-coverage/types.js';

import type { CoverageRequest } from '../code-intelligence/query-v2/engine.js';

import type {
  QueryCoverage,
  QueryCoverageCapability,
  QueryFleetCoverage,
} from '../code-intelligence/query-v2/types.js';

import type { MCPContext } from './context.js';

const SEVERITY: Record<GraphCoverageStatus, number> = {
  complete: 0,
  partial: 1,
  stale: 2,
  unavailable: 3,
};

function worst(statuses: GraphCoverageStatus[]): GraphCoverageStatus {
  let result: GraphCoverageStatus = 'complete';
  for (const status of statuses) {
    if (SEVERITY[status] > SEVERITY[result]) {
      result = status;
    }
  }
  return result;
}

export async function buildQueryCoverage(
  ctx: MCPContext,
  request: CoverageRequest,
  fleet: FleetSnapshot | null
): Promise<QueryCoverage | undefined> {
  const capabilities: Record<string, QueryCoverageCapability> = {};

  const evaluator = ctx.coverage;

  if (evaluator) {
    for (const capability of request.requiredCapabilities) {
      const evaluation = request.negative
        ? await evaluator.evaluateWithFreshness(capability as GraphCapability)
        : evaluator.evaluate(capability as GraphCapability);

      capabilities[capability] = {
        status: evaluation.status,
        negativeClaimSafe: evaluation.negativeClaimSafe,
        reasons: [...evaluation.reasons],
      };
    }
  }

  let fleetCoverage: QueryFleetCoverage | undefined;

  if (request.usesFleet) {
    fleetCoverage = fleet
      ? {
          status: fleet.coverage.status,
          negativeClaimSafe: fleet.coverage.negativeClaimSafe,
          reasons: [...fleet.coverage.reasons],
          projects: [...fleet.coverage.projects],
          missingProjects: [...fleet.coverage.missingProjects],
          staleProjects: [...fleet.coverage.staleProjects],
        }
      : {
          status: 'unavailable',
          negativeClaimSafe: false,
          reasons: ['FLEET_EMPTY'],
          projects: [],
          missingProjects: [],
          staleProjects: [],
        };
  }

  const capabilityList = Object.values(capabilities);

  if (capabilityList.length === 0 && !fleetCoverage) {
    return undefined;
  }

  const statuses: GraphCoverageStatus[] = capabilityList.map((entry) => entry.status);
  if (fleetCoverage) {
    statuses.push(fleetCoverage.status);
  }

  const status = worst(statuses);

  /*
   * `negativeClaimSafe` describes the scope, not this particular result: it is
   * true only when every capability the query depends on is safe for a
   * negative claim (complete AND fresh), and the Fleet is safe when used.
   * Negative queries are evaluated with freshness verification, so an empty
   * result can never be turned into a repository-wide absence claim here.
   */
  const negativeClaimSafe =
    capabilityList.every((entry) => entry.negativeClaimSafe) &&
    (fleetCoverage?.negativeClaimSafe ?? true);

  return {
    status,
    negativeClaimSafe,
    capabilities,
    ...(fleetCoverage ? { fleet: fleetCoverage } : {}),
    impactMayBeUnderreported: status !== 'complete',
  };
}
