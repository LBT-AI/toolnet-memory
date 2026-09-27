/*
 * Phase 78 — claim safety policy.
 *
 * The policy turns plan + observed evidence state into a structured decision.
 * Prose is never the only signal: every blocked or downgraded claim carries
 * machine-readable reasons.
 */

import { isNegativeClaim, profileDefinition } from './profiles.js';

import { dedupeReasons } from './diagnostics.js';

import type { CoverageCombination } from './coverage.js';

import type { PageCollection } from './pagination.js';

import type {
  ClaimSafety,
  EvidenceFleetFacts,
  EvidenceCrossServiceFacts,
  EvidencePlan,
  EvidenceUnresolvedReport,
} from './types.js';

export interface ClaimEvaluationInput {
  plan: EvidencePlan;
  coverage: CoverageCombination;
  /**
   * `changed` is a mid-run change; `expectedMismatch` is a caller-pinned
   * generation that no longer matches the live graph. Both invalidate a
   * negative/exhaustive conclusion, and neither is ever hidden.
   */
  generation: { current: string; changed: boolean; expectedMismatch: boolean };
  freshness: { checked: boolean; stale: boolean };
  pagination: PageCollection<unknown>;
  unresolved: EvidenceUnresolvedReport;
  sourceFallbackBlockers: readonly string[];
  fleet: EvidenceFleetFacts | null;
  crossService: EvidenceCrossServiceFacts | null;
  /** A participation edge (HANDLES, LISTENS_ON, …) was found for a dead-code claim. */
  deadCodeParticipation: boolean;
  /**
   * Phase 79: a runtime trace proves the subject executed.
   *
   * This can only ever BLOCK a dead-code claim. Runtime NON-observation is never
   * passed in here, because not observing something is not evidence that it does
   * not exist and must never make a claim safer.
   */
  runtimeExecuted: boolean;
}

export interface ClaimEvaluation {
  safety: ClaimSafety;
  complete: boolean;
  limitations: string[];
}

export function evaluateClaim(input: ClaimEvaluationInput): ClaimEvaluation {
  const { plan } = input;

  const definition = profileDefinition(plan.profile);

  const disposition = definition.claims[plan.claim];

  const negative = isNegativeClaim(plan.claim);

  if (disposition === 'blocked') {
    return {
      safety: {
        decision: 'blocked',
        negativeClaimSafe: false,
        exhaustiveClaimSafe: false,
        reasons: dedupeReasons([
          plan.claim === 'exhaustive' ? 'PROFILE_REQUIRED_AUDITOR' : 'PROFILE_REQUIRED_VERIFY',
        ]),
      },
      complete: false,
      limitations: ['PROFILE_CANNOT_SUPPORT_CLAIM'],
    };
  }

  const reasons: string[] = [];

  const limitations: string[] = [];

  if (input.generation.changed) {
    reasons.push('AUDIT_GENERATION_CHANGED');
    limitations.push('The graph generation changed during the run; evidence is not combinable.');
  }

  if (input.generation.expectedMismatch) {
    reasons.push('EVIDENCE_STALE_GENERATION');
    limitations.push(
      'The pinned expected generation does not match the current graph generation; re-run against the current generation.'
    );
  }

  if (plan.needFreshness && input.freshness.stale) {
    reasons.push('GENERATION_STALE');
  }

  if (!negative) {
    /*
     * Positive evidence stands on its own: a real CALLS edge is a fact even
     * when the surrounding coverage is partial. Coverage state is still
     * reported so the caller can qualify an impact claim.
     */
    if (input.coverage.blockers.length > 0) {
      reasons.push(...input.coverage.blockers);
    }
  } else {
    reasons.push(...input.coverage.blockers);
  }

  if (negative) {
    if (input.unresolved.relevant > 0) {
      reasons.push('UNRESOLVED_REFERENCES');
    }

    if (input.unresolved.ambiguous > 0) {
      reasons.push('AMBIGUOUS_REFERENCES');
    }

    if (input.unresolved.dynamic > 0) {
      reasons.push('DYNAMIC_TARGETS');
    }

    for (const blocker of input.sourceFallbackBlockers) {
      if (blocker === 'SOURCE_GAP_UNCLOSED') {
        reasons.push('PARSE_GAP_RELEVANT');
      } else {
        reasons.push(blocker);
      }
    }
  }

  if (
    !input.pagination.complete &&
    (plan.needPaginationComplete || (negative && plan.profile === 'auditor'))
  ) {
    if (input.pagination.cursorStale) {
      reasons.push('EVIDENCE_CURSOR_STALE');
    } else if (input.pagination.reason === 'AUDIT_LIMIT_REACHED') {
      reasons.push('AUDIT_LIMIT_REACHED');
    } else {
      reasons.push('PAGINATION_INCOMPLETE');
    }
  }

  if (plan.needsFleet && negative && plan.scope.kind === 'fleet') {
    if (!input.fleet) {
      reasons.push('FLEET_EMPTY');
    } else {
      reasons.push(...input.fleet.reasons);
    }
  }

  if (plan.needsCrossService && negative && input.crossService) {
    reasons.push(...input.crossService.reasons);
  }

  if (input.deadCodeParticipation) {
    reasons.push('DEAD_CODE_PARTICIPATION_EDGE');
    limitations.push('A participation edge exists; this symbol is not dead code.');
  }

  /*
   * Runtime execution is one-directional evidence: it can disprove "never
   * executed" and nothing else. Runtime silence is deliberately ignored here.
   */
  if (input.runtimeExecuted && plan.claim === 'dead_code') {
    reasons.push('RUNTIME_SYMBOL_OBSERVED');
    limitations.push(
      'This symbol provably executed in at least one imported trace session; it is not dead for those observations.'
    );
  }

  const uniqueReasons = dedupeReasons(reasons);

  const hasBlockers = uniqueReasons.length > 0;

  let decision: ClaimSafety['decision'];

  if (negative) {
    decision = hasBlockers ? 'blocked' : disposition;
  } else {
    decision = disposition;
  }

  /*
   * Dead code is never "safe to delete": even a clean audit only proves there
   * are no known incoming references within the audited scope.
   */
  if (plan.claim === 'dead_code' && decision !== 'blocked') {
    decision = 'provisional';
    limitations.push('Never safe to delete automatically; human confirmation is required.');
  }

  if (disposition === 'provisional' && plan.profile === 'scout' && !hasBlockers) {
    uniqueReasons.push('SCOUT_PROVISIONAL_ONLY');
  }

  const safe =
    decision === 'allowed' &&
    negative &&
    !hasBlockers &&
    input.coverage.negativeSafe &&
    input.pagination.complete &&
    input.unresolved.relevant === 0 &&
    (!plan.needsFleet || plan.scope.kind !== 'fleet' || input.fleet?.negativeClaimSafe === true) &&
    (!plan.needsCrossService || input.crossService?.negativeClaimSafe === true);

  const safety: ClaimSafety = {
    decision,
    negativeClaimSafe: safe,
    exhaustiveClaimSafe: safe && plan.profile === 'auditor',
    reasons: dedupeReasons(uniqueReasons),
  };

  const complete =
    decision === 'allowed' &&
    !(input.generation.changed || input.generation.expectedMismatch) &&
    (!negative || input.pagination.complete);

  return { safety, complete, limitations };
}
