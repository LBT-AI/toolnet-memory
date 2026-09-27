/*
 * Phase 78 — coverage combination.
 *
 * Coverage is inspected BEFORE a negative claim is decided, never afterwards.
 * The Phase 68 evaluator stays the single source of coverage truth; this module
 * only combines the per-capability state required by a plan.
 */

import type { GraphCoverageStatus } from '../graph-coverage/types.js';

import type { EvidenceCapability, EvidenceFacts, EvidenceRequirement } from './types.js';

export interface CoverageEntry {
  capability: EvidenceCapability;
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface CoverageCombination {
  entries: CoverageEntry[];
  blockers: string[];
  /** Every required capability is producer-backed and safe for absence claims. */
  negativeSafe: boolean;
}

function rank(status: GraphCoverageStatus): number {
  switch (status) {
    case 'unavailable':
      return 3;
    case 'stale':
      return 2;
    case 'partial':
      return 1;
    default:
      return 0;
  }
}

function worst(left: GraphCoverageStatus, right: GraphCoverageStatus): GraphCoverageStatus {
  return rank(left) >= rank(right) ? left : right;
}

export function combineCoverage(
  facts: EvidenceFacts,
  requirements: readonly EvidenceRequirement[],
  edgeType?: string
): CoverageCombination {
  const entries: CoverageEntry[] = [];
  const blockers: string[] = [];

  for (const requirement of requirements) {
    if (!facts.coverageAvailable) {
      entries.push({
        capability: requirement.capability,
        status: 'unavailable',
        negativeClaimSafe: false,
        reasons: ['COVERAGE_UNAVAILABLE'],
      });

      blockers.push('COVERAGE_UNAVAILABLE');
      continue;
    }

    const evaluation = facts.coverageFor(requirement.capability);

    const produced = facts.capabilityProduced(requirement.capability, edgeType);

    const reasons = [...evaluation.reasons];

    let status = evaluation.status;

    let negativeClaimSafe = evaluation.negativeClaimSafe;

    if (!produced) {
      /*
       * A reserved vocabulary entry (declared in the schema, no producer yet)
       * can never ground an absence claim. Absence of evidence is not evidence
       * of absence when nothing can emit the edge in the first place.
       */
      reasons.push('RESERVED_CAPABILITY_NO_PRODUCER');
      negativeClaimSafe = false;
      status = worst(status, 'partial');
      blockers.push('RESERVED_CAPABILITY_NO_PRODUCER');
    }

    if (status === 'partial') {
      blockers.push('COVERAGE_PARTIAL');
    } else if (status === 'stale') {
      blockers.push('COVERAGE_STALE');
    } else if (status === 'unavailable') {
      blockers.push('COVERAGE_UNAVAILABLE');
    }

    if (requirement.requiredForNegative && !negativeClaimSafe) {
      blockers.push('COVERAGE_PARTIAL');
    }

    entries.push({
      capability: requirement.capability,
      status,
      negativeClaimSafe,
      reasons,
    });
  }

  const negativeSafe = entries.every(
    (entry) => entry.status === 'complete' && entry.negativeClaimSafe
  );

  return {
    entries: entries.sort((left, right) => left.capability.localeCompare(right.capability)),
    blockers: [...new Set(blockers)],
    negativeSafe,
  };
}
