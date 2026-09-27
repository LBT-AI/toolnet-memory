import type { GraphCapability } from '../code-intelligence/graph-coverage/types.js';

import type { CoverageEvaluation } from '../code-intelligence/graph-coverage/coverage-evaluator.js';

import type { MCPContext } from './context.js';

export interface ToolCoverageOptions {
  capability: GraphCapability;
  /*
   * True when the tool result is a negative claim (empty result,
   * not found, no dependents, no path). Negative claims trigger
   * manifest freshness verification.
   */
  negative?: boolean;
  verifyOnNegative?: boolean;
  /*
   * Impact analysis tools always report whether blast radius may be
   * under-reported when coverage is not complete.
   */
  impact?: boolean;
  /*
   * Phase 72: also attach the cross-service capability trust so impact
   * results can flag that cross-service blast radius may be under-reported.
   */
  crossService?: boolean;
}

export interface ToolCrossServiceCoverage {
  status: CoverageEvaluation['status'];
  negativeClaimSafe: boolean;
  reasons: CoverageEvaluation['reasons'];
  services?: number;
  crossServiceLinks?: number;
  impactMayBeUnderreported?: boolean;
}

export interface ToolCoverageOutput {
  capability: GraphCapability;
  status: CoverageEvaluation['status'];
  negativeClaimSafe: boolean;
  reasons: CoverageEvaluation['reasons'];
  freshness?: CoverageEvaluation['freshness'];
  impactMayBeUnderreported?: boolean;
  crossServiceCoverage?: ToolCrossServiceCoverage;
}

/*
 * Single central attachment point.
 *
 * Every negative-sensitive MCP tool calls this helper instead of reading
 * coverage JSON or duplicating evaluation logic.
 */
export async function attachToolCoverage(
  ctx: MCPContext,
  options: ToolCoverageOptions
): Promise<ToolCoverageOutput | null> {
  const evaluator = ctx.coverage;

  if (!evaluator) {
    return null;
  }

  const verifyOnNegative = options.verifyOnNegative ?? true;

  const evaluation =
    options.negative && verifyOnNegative
      ? await evaluator.evaluateWithFreshness(options.capability)
      : evaluator.evaluate(options.capability);

  const output: ToolCoverageOutput = {
    capability: evaluation.capability,
    status: evaluation.status,
    negativeClaimSafe: evaluation.negativeClaimSafe,
    reasons: evaluation.reasons,
  };

  if (evaluation.freshness.checked) {
    output.freshness = evaluation.freshness;
  }

  if (options.impact) {
    output.impactMayBeUnderreported = evaluation.status !== 'complete';
  }

  if (options.crossService) {
    const crossService = evaluator.evaluate('cross_service_graph');
    const snapshot = ctx.crossService ?? null;

    output.crossServiceCoverage = {
      status: crossService.status,
      negativeClaimSafe: crossService.negativeClaimSafe,
      reasons: crossService.reasons,
      ...(snapshot ? { services: snapshot.stats.services } : {}),
      ...(snapshot ? { crossServiceLinks: snapshot.stats.crossServiceLinks } : {}),
      impactMayBeUnderreported: crossService.status !== 'complete',
    };
  }

  return output;
}
