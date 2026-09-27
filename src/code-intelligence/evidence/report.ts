/*
 * Phase 78 — evidence bundle assembly.
 *
 * The bundle is derived state: it can always be recomputed from the graph and
 * is never an authority. It carries provenance for every item so a caller can
 * tell graph facts, coverage gaps, source fallback and ADR constraints apart.
 */

import { profileDefinition } from './profiles.js';

import { dedupeReasons } from './diagnostics.js';

import type { CoverageEntry } from './coverage.js';

import type {
  ClaimSafety,
  EvidenceAdrConstraint,
  EvidenceBundle,
  EvidenceItem,
  EvidencePlan,
  EvidenceRequirement,
  EvidenceRuntimeReport,
  EvidenceSourceFallbackReport,
  EvidenceUnresolvedReport,
} from './types.js';

export interface BuildBundleInput {
  plan: EvidencePlan;
  generation: { project: string; fleet?: string };
  evidence: EvidenceItem[];
  pagination: { complete: boolean; pages: number; rows: number; truncated: boolean };
  coverage: CoverageEntry[];
  sourceFallback: EvidenceSourceFallbackReport;
  unresolved: EvidenceUnresolvedReport;
  /** Phase 79 runtime evidence section (never authoritative). */
  runtime: EvidenceRuntimeReport;
  safety: ClaimSafety;
  complete: boolean;
  limitations: string[];
  adrConstraints: EvidenceAdrConstraint[];
}

export function buildEvidenceBundle(input: BuildBundleInput): EvidenceBundle {
  const definition = profileDefinition(input.plan.profile);

  const evidence = [...input.evidence].sort((left, right) => {
    if (left.origin !== right.origin) {
      return left.origin.localeCompare(right.origin);
    }

    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return left.id.localeCompare(right.id);
  });

  const coverage = [...input.coverage].sort((left, right) =>
    left.capability.localeCompare(right.capability)
  );

  const limitations = [...new Set([...input.limitations, ...limitationNotes(input)])].sort();

  return {
    profile: input.plan.profile,
    evidenceLevel: definition.evidenceLevel,

    operation: input.plan.operation,
    claim: input.plan.claim,
    scope: input.plan.scope,

    generation: input.generation,

    requirements: input.plan.requirements as EvidenceRequirement[],
    evidence,

    coverage: coverage.map((entry) => ({
      capability: entry.capability,
      status: entry.status,
      negativeClaimSafe: entry.negativeClaimSafe,
      reasons: dedupeReasons(entry.reasons),
    })),

    pagination: input.pagination,
    sourceFallback: input.sourceFallback,
    unresolved: input.unresolved,
    runtime: input.runtime,

    claimSafety: {
      ...input.safety,
      reasons: dedupeReasons(input.safety.reasons),
    },

    limitations,
    diagnostics: dedupeReasons(input.safety.reasons),

    adrConstraints: [...input.adrConstraints].sort((left, right) =>
      left.id.localeCompare(right.id)
    ),

    complete: input.complete,
    fingerprint: input.plan.fingerprint,
  };
}

function limitationNotes(input: BuildBundleInput): string[] {
  const notes: string[] = [];

  if (input.pagination.truncated) {
    notes.push('Evidence rows were truncated by the profile limit.');
  }

  if (input.safety.decision === 'provisional') {
    notes.push('This evidence is provisional only and may not be stated as a conclusion.');
  }

  if (input.safety.decision === 'blocked') {
    notes.push(`Blocked by: ${input.safety.reasons.join(', ') || 'insufficient evidence'}.`);
  }

  if (input.runtime.requested && !input.runtime.available) {
    notes.push(
      'No compatible runtime trace evidence is available; absence of a runtime observation is never proof of absence.'
    );
  }

  return notes;
}
