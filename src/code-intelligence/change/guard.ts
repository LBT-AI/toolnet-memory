/*
 * Phase 80 — regression guard.
 *
 * The guard reports whether the evidence is sufficient; it never approves a
 * merge or a deployment. `clear` means "no blocking issue detected within the
 * verified declared scope", never "globally safe". Every downgrade carries a
 * machine-readable reason code.
 */

import type { EvidenceClaimKind, EvidenceProfile } from '../evidence/types.js';

import type {
  AdrConstraintEntry,
  ChangeClaimSafety,
  ChangeCoverage,
  ChangeFacts,
  ChangeGap,
  ChangedEntity,
  GuardBlocker,
  GuardDecision,
  GuardReasonCode,
  ImpactEvidence,
  RegressionGuardResult,
} from './types.js';

import type { ImpactResult } from './impact.js';

export interface GuardInput {
  profile: EvidenceProfile;
  claim: EvidenceClaimKind;
  facts: ChangeFacts;
  entities: readonly ChangedEntity[];
  coverage: ChangeCoverage;
  gaps: readonly ChangeGap[];
  impact: ImpactResult;
  adrConstraints: readonly AdrConstraintEntry[];
  /** The change input changed during analysis. */
  inputChanged: boolean;
  /** A bound stopped the analysis. */
  limitReached: boolean;
}

export interface GuardEvaluation {
  guard: RegressionGuardResult;
  claimSafety: ChangeClaimSafety;
  limitations: string[];
  diagnostics: string[];
  complete: boolean;
}

/** Reasons that make the whole analysis incomplete (evidence cannot support any conclusion). */
const INCOMPLETE_CODES = new Set<GuardReasonCode>([
  'CHANGE_ANALYSIS_LIMIT_REACHED',
  'AUDIT_LIMIT_REACHED',
  'BINARY_CHANGE_UNANALYZED',
  'GRAPH_STALE',
  'COVERAGE_UNAVAILABLE',
  'CHANGE_INPUT_CHANGED',
  'PROFILE_REQUIRES_VERIFY',
  'PROFILE_REQUIRES_AUDITOR',
]);

function isNegativeClaim(claim: EvidenceClaimKind): boolean {
  return (
    claim === 'negative' || claim === 'absence' || claim === 'uniqueness' || claim === 'exhaustive'
  );
}

function allImpact(impact: ImpactResult): ImpactEvidence[] {
  return [
    ...impact.directImpact,
    ...impact.transitiveImpact,
    ...impact.crossServiceImpact,
    ...impact.crossRepoImpact,
  ];
}

export function evaluateGuard(input: GuardInput): GuardEvaluation {
  const blockers: GuardBlocker[] = [];
  const reasons: GuardReasonCode[] = [];
  const limitations: string[] = [];
  const diagnostics: string[] = [];

  const add = (code: GuardReasonCode, detail?: string): void => {
    if (!reasons.includes(code)) {
      reasons.push(code);
      blockers.push(detail === undefined ? { code } : { code, detail });
      return;
    }

    /* Keep the first detail; later duplicates add no information. */
  };

  const impact = allImpact(input.impact);

  /* --- Deleted symbols with known consumers --- */
  for (const entity of input.entities) {
    const deleted = entity.semantic.includes('SYMBOL_DELETED') && !entity.candidatePresence;

    if (!deleted || !entity.symbolId) {
      continue;
    }

    const consumers = impact.filter((item) => item.path.at(-1)?.to === entity.symbolId);

    if (consumers.length > 0) {
      const byRelation = new Map<string, number>();

      for (const consumer of consumers) {
        byRelation.set(consumer.relation, (byRelation.get(consumer.relation) ?? 0) + 1);
      }

      const detail = [...byRelation.entries()]
        .map(([relation, count]) => `${count} ${relation}`)
        .sort()
        .join(', ');

      add('DELETED_SYMBOL_HAS_CALLERS', `${entity.name ?? entity.symbolId}: ${detail}`);
      limitations.push(
        `Deleted ${entity.name ?? entity.symbolId} still has incoming dependencies; removal needs review.`
      );
    }
  }

  /* --- Removed routes with known clients --- */
  const removedRoutes = input.entities.filter((entity) =>
    entity.semantic.includes('ROUTE_REMOVED')
  );

  if (removedRoutes.length > 0) {
    const routeIds = new Set(
      removedRoutes.map((entity) => entity.symbolId).filter((id): id is string => Boolean(id))
    );

    const clients = impact.filter(
      (item) => routeIds.has(item.symbolId) || routeIds.has(item.path.at(-1)?.to ?? '')
    );

    if (clients.length > 0) {
      add(
        'REMOVED_ROUTE_HAS_CLIENTS',
        removedRoutes.map((entity) => entity.name ?? entity.symbolId).join(', ')
      );
      limitations.push('A removed/changed route still has known callers or handlers.');
    }
  }

  /* --- Event channel changes with consumers --- */
  const eventChanges = input.entities.filter((entity) =>
    entity.semantic.includes('EVENT_CHANNEL_CHANGED')
  );

  if (
    eventChanges.length > 0 &&
    impact.some((item) => item.relation === 'EMITS' || item.relation === 'LISTENS_ON')
  ) {
    add(
      'EVENT_CHANNEL_HAS_CONSUMERS',
      eventChanges.map((entity) => entity.name ?? entity.symbolId).join(', ')
    );
  }

  /* --- Mapping gaps --- */
  if (input.gaps.some((gap) => gap.kind === 'BINARY_FILE')) {
    add('BINARY_CHANGE_UNANALYZED');
    limitations.push('A binary change has no deterministic analyzer; its impact is unknown.');
  }

  if (input.gaps.some((gap) => gap.kind === 'UNSUPPORTED_LANGUAGE')) {
    add('UNSUPPORTED_LANGUAGE_CHANGE');
  }

  if (input.gaps.some((gap) => gap.kind === 'UNMAPPED_HUNK' || gap.kind === 'PARSE_FAILURE')) {
    add('UNMAPPED_CHANGE');
  }

  /* --- Coverage / freshness --- */
  if (!input.facts.coverageAvailable) {
    add('COVERAGE_UNAVAILABLE');
  } else {
    const coverage = input.facts.coverageFor('call_graph');

    if (!coverage.available) {
      add('COVERAGE_UNAVAILABLE');
    } else if (!coverage.negativeClaimSafe) {
      add('COVERAGE_PARTIAL');
    }
  }

  if (input.facts.currentGeneration() !== input.facts.generation) {
    add('GRAPH_STALE');
    limitations.push('The graph generation changed during analysis; evidence is not combinable.');
  }

  if (input.facts.fleet) {
    if (
      input.facts.fleet.staleProjects.length > 0 ||
      input.facts.fleet.missingProjects.length > 0
    ) {
      add('FLEET_STALE');
    }

    if (input.facts.fleet.registeredProjects.length === 0) {
      add('FLEET_SCOPE_UNBOUNDED');
    }
  }

  if (input.facts.crossService) {
    if (input.facts.crossService.unresolved > 0 || input.facts.crossService.dynamic > 0) {
      add('UNRESOLVED_REFERENCE');
    }

    if (input.facts.crossService.ambiguous > 0) {
      add('AMBIGUOUS_ENDPOINT');
    }
  }

  /* --- ADR constraints (context, never proof, never an automatic violation) --- */
  if (input.adrConstraints.length > 0) {
    add('ADR_CONSTRAINT', input.adrConstraints.map((entry) => entry.id).join(', '));
  }

  /* --- Candidate-side provisionality --- */
  const hasAddedEntity = input.entities.some(
    (entity) => !entity.baselinePresence && entity.candidatePresence
  );

  if (input.facts.candidateGeneration === undefined && hasAddedEntity) {
    /*
     * A brand-new entity has no baseline edges, so its consumers are unknown
     * until the candidate source is indexed. Deleted entities are resolved
     * against the baseline graph and do NOT need a candidate generation.
     */
    add('POST_CHANGE_GRAPH_UNAVAILABLE');
    limitations.push(
      'No post-change generation is indexed; new-entity conclusions are provisional.'
    );
  }

  if (input.limitReached) {
    add('CHANGE_ANALYSIS_LIMIT_REACHED');
  }

  if (input.inputChanged) {
    add('CHANGE_INPUT_CHANGED');
    limitations.push(
      'The change input moved during analysis; the result pins the earlier snapshot.'
    );
  }

  /* --- Profile gating --- */
  const negative = isNegativeClaim(input.claim);

  if (negative && input.profile === 'scout') {
    add('PROFILE_REQUIRES_VERIFY');
  }

  if (input.claim === 'exhaustive' && input.profile !== 'auditor') {
    add('PROFILE_REQUIRES_AUDITOR');
  }

  /* --- Negative-claim safety --- */
  const coverageComplete = input.facts.coverageAvailable
    ? input.facts.coverageFor('call_graph').negativeClaimSafe
    : false;

  const noBlockers = !reasons.some((code) => INCOMPLETE_CODES.has(code));
  const noReviewReasons = reasons.length === 0;

  const negativeClaimSafe =
    negative &&
    input.profile !== 'scout' &&
    coverageComplete &&
    noBlockers &&
    input.facts.crossService?.negativeClaimSafe !== false &&
    !limitations.some((value) => value.includes('not combinable'));

  const exhaustiveClaimSafe = negativeClaimSafe && input.profile === 'auditor';

  const claimDecision: ChangeClaimSafety['decision'] =
    negative && !negativeClaimSafe
      ? 'blocked'
      : input.profile === 'scout'
        ? 'provisional'
        : 'allowed';

  const claimSafety: ChangeClaimSafety = {
    decision: claimDecision,
    negativeClaimSafe,
    exhaustiveClaimSafe,
    reasons: [...reasons],
  };

  /* --- Decision --- */
  let decision: GuardDecision;

  if (!noBlockers) {
    decision = 'incomplete';
  } else if (!noReviewReasons) {
    decision = 'review_required';
  } else if (!coverageComplete) {
    decision = 'incomplete';
  } else {
    decision = 'clear';
  }

  const guard: RegressionGuardResult = {
    decision,
    reasons: [...reasons],
    blockers,
    safeToMerge: false,
    safeToDeploy: false,
  };

  if (decision === 'clear') {
    diagnostics.push('NO_BLOCKING_ISSUE_WITHIN_VERIFIED_SCOPE');
  }

  if (decision === 'clear' && impact.length === 0) {
    diagnostics.push('NO_KNOWN_IMPACT_WITHIN_AUDITED_SCOPE');
  }

  const complete =
    decision !== 'incomplete' &&
    !input.limitReached &&
    !input.inputChanged &&
    input.facts.currentGeneration() === input.facts.generation;

  return { guard, claimSafety, limitations, diagnostics, complete };
}
