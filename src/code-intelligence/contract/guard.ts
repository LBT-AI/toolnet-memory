/*
 * Phase 81 — contract compatibility guard.
 *
 * The guard reports whether the evidence is sufficient; it never approves a
 * merge or a deployment. `compatible` means "no deterministic incompatible
 * contract change was found within the verified supported scope", never
 * "globally safe". Every downgrade carries a machine-readable reason code.
 */

import type { EvidenceClaimKind, EvidenceProfile } from '../evidence/types.js';

import type {
  Compatibility,
  ConsumerImpact,
  ContractAdrConstraint,
  ContractClaimSafety,
  ContractCoverage,
  ContractDelta,
  ContractFacts,
  ContractGuardResult,
  ContractReasonCode,
} from './types.js';

export interface ContractGuardInput {
  profile: EvidenceProfile;
  claim: EvidenceClaimKind;
  facts: ContractFacts;
  deltas: readonly ContractDelta[];
  consumers: readonly ConsumerImpact[];
  coverage: ContractCoverage;
  adrConstraints: readonly ContractAdrConstraint[];
  /** The change input moved during analysis. */
  inputChanged: boolean;
  /** A bound stopped the analysis. */
  limitReached: boolean;
  /** Consumer coverage is partial (reserved vocabulary / stale Fleet). */
  consumerPartial: boolean;
}

export interface ContractGuardEvaluation {
  guard: ContractGuardResult;
  claimSafety: ContractClaimSafety;
  limitations: string[];
  diagnostics: string[];
  complete: boolean;
}

const INCOMPLETE_CODES = new Set<ContractReasonCode>([
  'CONTRACT_ANALYSIS_LIMIT_REACHED',
  'CONTRACT_SCHEMA_UNSUPPORTED',
  'BASELINE_CONTRACT_UNAVAILABLE',
  'CANDIDATE_CONTRACT_UNAVAILABLE',
  'CONTRACT_COVERAGE_PARTIAL',
  'CONTRACT_GENERATION_CHANGED',
  'CONTRACT_INPUT_CHANGED',
  'PROFILE_REQUIRES_VERIFY',
  'PROFILE_REQUIRES_AUDITOR',
]);

function isNegativeClaim(claim: EvidenceClaimKind): boolean {
  return (
    claim === 'negative' || claim === 'absence' || claim === 'uniqueness' || claim === 'exhaustive'
  );
}

function worstCompatibility(deltas: readonly ContractDelta[]): Compatibility {
  let result: Compatibility = 'compatible';

  for (const delta of deltas) {
    if (delta.compatibility === 'breaking') {
      return 'breaking';
    }

    if (delta.compatibility === 'potentially_breaking') {
      result = 'potentially_breaking';
    }
  }

  return result;
}

export function evaluateContractGuard(input: ContractGuardInput): ContractGuardEvaluation {
  const reasons: ContractReasonCode[] = [];
  const blockers: Array<{ code: ContractReasonCode; detail?: string }> = [];
  const limitations: string[] = [];
  const diagnostics: string[] = [];

  const add = (code: ContractReasonCode, detail?: string): void => {
    if (!reasons.includes(code)) {
      reasons.push(code);
      blockers.push(detail === undefined ? { code } : { code, detail });
    }
  };

  /* --- Structural changes: reasons come from the diff, not from consumers --- */
  for (const delta of input.deltas) {
    for (const change of delta.changes) {
      if (change.reason) {
        add(change.reason, `${delta.identity}: ${change.detail}`);
      }
    }
  }

  /* --- Coverage --- */
  if (!input.facts.coverageAvailable) {
    add('CONTRACT_COVERAGE_PARTIAL', 'coverage evaluator unavailable');
  } else {
    for (const capability of ['call_graph', 'dependency_graph', 'cross_service_graph']) {
      const coverage = input.facts.coverageFor(capability);

      if (!coverage.available) {
        add('CONTRACT_COVERAGE_PARTIAL', `${capability} unavailable`);
      } else if (!coverage.negativeClaimSafe) {
        add('CONTRACT_COVERAGE_PARTIAL', `${capability} partial`);
      }
    }
  }

  if (input.coverage.unsupported.length > 0) {
    add(
      'CONTRACT_SCHEMA_UNSUPPORTED',
      input.coverage.unsupported.map((item) => item.path).join(', ')
    );
    limitations.push(
      'One or more contract files use an unsupported format/construct; completeness is not claimed for them.'
    );
  }

  for (const ref of input.coverage.unresolvedRefs) {
    if (ref.reason === 'REMOTE_REF') {
      add('REMOTE_CONTRACT_REF_BLOCKED', `${ref.path} -> ${ref.ref}`);
      limitations.push('A remote contract $ref was blocked and never fetched.');
    } else if (ref.reason === 'PATH_ESCAPE') {
      add('CONTRACT_PATH_ESCAPE_BLOCKED', `${ref.path} -> ${ref.ref}`);
      limitations.push('A contract $ref escaping the project was blocked.');
    } else if (ref.reason === 'REF_CYCLE') {
      add('CONTRACT_REF_CYCLE', `${ref.path} -> ${ref.ref}`);
    }
  }

  /*
   * An unavailable side is only a blocker when the OTHER side still shows the
   * file as a live contract. An added file legitimately has no baseline and a
   * deleted file legitimately has no candidate, and neither may be reported as
   * a missing contract generation.
   */
  const candidateOnly = input.coverage.candidatesUnavailable;
  const baselineOnly = input.coverage.baselinesUnavailable;

  const baselineMissing = baselineOnly.filter((path) => !candidateOnly.includes(path));
  const candidateMissing = candidateOnly.filter((path) => !baselineOnly.includes(path));

  if (baselineMissing.length > 0) {
    add('BASELINE_CONTRACT_UNAVAILABLE', baselineMissing.join(', '));
    limitations.push('Some changed contract paths had no readable baseline content.');
  }

  if (candidateMissing.length > 0) {
    add('CANDIDATE_CONTRACT_UNAVAILABLE', candidateMissing.join(', '));
    limitations.push('Some changed contract paths had no readable candidate content.');
  }

  if (input.consumerPartial) {
    add('CONSUMER_COVERAGE_PARTIAL');
    limitations.push('Consumer coverage is partial for at least one contract surface.');
  }

  /* --- Fleet --- */
  if (input.facts.fleet) {
    if (
      input.facts.fleet.staleProjects.length > 0 ||
      input.facts.fleet.missingProjects.length > 0
    ) {
      add('FLEET_STALE');
    }

    if (input.facts.fleet.registeredProjects.length === 0) {
      add('FLEET_SCOPE_UNBOUNDED');
      limitations.push('No registered Fleet participants; cross-repo claims are unbounded.');
    }
  }

  /* --- Cross-service --- */
  if (input.facts.crossService) {
    if (input.facts.crossService.unresolved > 0 || input.facts.crossService.dynamic > 0) {
      add('UNRESOLVED_REFERENCE');
    }

    if (input.facts.crossService.ambiguous > 0) {
      add('AMBIGUOUS_ENDPOINT');
    }
  }

  /* --- ADR constraints: context, never proof, never an automatic violation --- */
  if (input.adrConstraints.length > 0) {
    add('ADR_CONSTRAINT', input.adrConstraints.map((entry) => entry.id).join(', '));
  }

  /* --- Freshness --- */
  if (input.facts.currentGeneration() !== input.facts.generation) {
    add('CONTRACT_GENERATION_CHANGED');
    limitations.push('The graph generation changed during analysis; evidence is not combinable.');
  }

  if (input.limitReached) {
    add('CONTRACT_ANALYSIS_LIMIT_REACHED');
    limitations.push('A bound stopped the analysis; completeness is not claimed.');
  }

  if (input.inputChanged) {
    add('CONTRACT_INPUT_CHANGED');
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

  const overall = worstCompatibility(input.deltas);

  const incomplete = reasons.some((code) => INCOMPLETE_CODES.has(code));

  const coverageComplete = input.facts.coverageAvailable
    ? ['call_graph', 'dependency_graph'].every(
        (capability) => input.facts.coverageFor(capability).negativeClaimSafe
      )
    : false;

  const negativeClaimSafe =
    negative &&
    input.profile !== 'scout' &&
    !incomplete &&
    coverageComplete &&
    !input.consumerPartial;

  if (negative && !negativeClaimSafe) {
    add('NEGATIVE_CLAIM_NOT_SAFE');
  }

  const exhaustiveClaimSafe = negativeClaimSafe && input.profile === 'auditor';

  const claimDecision: ContractClaimSafety['decision'] =
    negative && !negativeClaimSafe
      ? 'blocked'
      : input.profile === 'scout'
        ? 'provisional'
        : 'allowed';

  const claimSafety: ContractClaimSafety = {
    decision: claimDecision,
    negativeClaimSafe,
    exhaustiveClaimSafe,
    reasons: [...reasons],
  };

  /* --- Decision --- */
  let decision: ContractGuardResult['decision'];

  if (incomplete) {
    decision = 'incomplete';
  } else if (
    overall === 'breaking' ||
    overall === 'potentially_breaking' ||
    overall === 'unknown' ||
    input.consumerPartial ||
    input.adrConstraints.length > 0
  ) {
    decision = 'review_required';
  } else {
    decision = 'compatible';
  }

  if (decision === 'compatible') {
    diagnostics.push('NO_BREAKING_CONTRACT_CHANGE_WITHIN_VERIFIED_SCOPE');
    blockers.push({ code: 'NO_BREAKING_CONTRACT_CHANGE' });
  }

  const guard: ContractGuardResult = {
    decision,
    reasons: [...reasons],
    blockers,
    safeToMerge: false,
    safeToDeploy: false,
  };

  const complete =
    decision !== 'incomplete' &&
    !input.limitReached &&
    !input.inputChanged &&
    input.facts.currentGeneration() === input.facts.generation;

  return { guard, claimSafety, limitations, diagnostics, complete };
}
