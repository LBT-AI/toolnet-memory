/*
 * Phase 78 — shared project evidence facts.
 *
 * Translates the persisted Phase 68/72/73 snapshots into the evidence facts
 * surface. Shared by the MCP adapter and the Phase 77 runtime so standalone and
 * daemon evidence runs observe identical coverage, gaps and Fleet state.
 */

import type { GraphCoverageEvaluator } from '../graph-coverage/coverage-evaluator.js';

import type { FreshnessCheckResult } from '../graph-coverage/freshness-checker.js';

import type {
  CoverageReasonCode,
  GraphCapability,
  GraphCoverageSnapshot,
} from '../graph-coverage/types.js';

import type { CrossServiceSnapshot } from '../cross-service/types.js';

import type { FleetSnapshot } from '../fleet/types.js';

import {
  buildEvidenceFacts,
  type EvidenceCoverageProvider,
  type EvidenceFactsInput,
} from './facts.js';

import type {
  EvidenceCapabilityCoverage,
  EvidenceCrossServiceFacts,
  EvidenceFacts,
  EvidenceFleetFacts,
  EvidenceGap,
  EvidenceGapKind,
} from './types.js';

const GAP_KIND_BY_REASON: Partial<Record<CoverageReasonCode, EvidenceGapKind>> = {
  PARSE_FAILURE: 'parse_failure',
  STRUCTURAL_PARSE_FAILED: 'parse_failure',
  STRUCTURAL_PARSER_UNAVAILABLE: 'unsupported_language',
  UNSUPPORTED_STRUCTURAL_LANGUAGE: 'unsupported_language',
  LEXICAL_ONLY_LANGUAGE: 'unsupported_language',
  SKIPPED_SENSITIVE_SOURCE: 'skipped_sensitive',
  UNRESOLVED_CALL_REFERENCE: 'unresolved_reference',
  UNRESOLVED_IMPORT: 'unresolved_reference',
  UNRESOLVED_HTTP_REFERENCE: 'unresolved_reference',
  UNRESOLVED_EVENT_CHANNEL: 'unresolved_reference',
  CROSS_SERVICE_UNRESOLVED: 'unresolved_reference',
  AMBIGUOUS_CALL_TARGET: 'ambiguous_reference',
  AMBIGUOUS_ENDPOINT: 'ambiguous_reference',
  UNKNOWN_RECEIVER_TYPE: 'ambiguous_reference',
  INDIRECT_CALL_TARGET: 'dynamic_target',
  DYNAMIC_ENDPOINT: 'dynamic_target',
};

export function gapsFromCoverageSnapshot(snapshot: GraphCoverageSnapshot | null): EvidenceGap[] {
  if (!snapshot) {
    return [];
  }

  const gaps: EvidenceGap[] = [];

  for (const [capability, coverage] of Object.entries(snapshot.capabilities) as Array<
    [GraphCapability, { status: string; reasons: CoverageReasonCode[] }]
  >) {
    if (coverage.status === 'complete') {
      continue;
    }

    for (const reason of coverage.reasons) {
      const kind = GAP_KIND_BY_REASON[reason];

      if (!kind) {
        continue;
      }

      gaps.push({ kind, capability, detail: reason });
    }
  }

  return gaps;
}

export function gapsFromCrossServiceSnapshot(snapshot: CrossServiceSnapshot | null): EvidenceGap[] {
  if (!snapshot) {
    return [];
  }

  const gaps: EvidenceGap[] = [];

  for (const reference of snapshot.unresolved) {
    const kind: EvidenceGapKind =
      reference.reason === 'AMBIGUOUS_ROUTE'
        ? 'ambiguous_reference'
        : reference.reason === 'DYNAMIC_TARGET'
          ? 'dynamic_target'
          : reference.reason === 'UNSUPPORTED_FRAMEWORK'
            ? 'unsupported_language'
            : 'unresolved_reference';

    gaps.push({
      kind,
      capability: 'cross_service_graph',
      path: reference.filePath,
      ...(reference.line !== undefined ? { line: reference.line } : {}),
      detail: reference.reason,
    });
  }

  return gaps;
}

export function fleetFactsFromSnapshot(snapshot: FleetSnapshot | null): EvidenceFleetFacts | null {
  if (!snapshot) {
    return null;
  }

  const registeredProjects = snapshot.projects.map((project) => project.projectId);

  const staleProjects = snapshot.projects
    .filter((project) => project.stale)
    .map((project) => project.projectId);

  const missingProjects = snapshot.projects
    .filter((project) => project.availability !== 'available')
    .map((project) => project.projectId);

  return {
    generation: snapshot.generation,
    registeredProjects,
    staleProjects,
    missingProjects,
    crossProjectEdges: snapshot.stats.crossProjectEdges,
    negativeClaimSafe: snapshot.coverage.negativeClaimSafe,
    reasons: [...snapshot.coverage.reasons],
  };
}

export function crossServiceFactsFromSnapshot(
  snapshot: CrossServiceSnapshot | null,
  evaluator?: GraphCoverageEvaluator | null
): EvidenceCrossServiceFacts | null {
  if (!snapshot) {
    return null;
  }

  const coverage = evaluator ? evaluator.evaluate('cross_service_graph') : null;

  return {
    generation: snapshot.generation,
    ambiguous: snapshot.stats.ambiguous,
    unresolved: snapshot.stats.unresolved,
    dynamic: snapshot.unresolved.filter((reference) => reference.reason === 'DYNAMIC_TARGET')
      .length,
    unsupportedFrameworks: [...snapshot.stats.unsupportedFrameworks],
    negativeClaimSafe: coverage?.negativeClaimSafe ?? false,
    reasons: coverage?.reasons ?? [],
  };
}

/** Coverage provider that caches per-capability evaluations for one run. */
export function createCoverageProvider(
  evaluator: GraphCoverageEvaluator,
  freshness?: FreshnessCheckResult | null
): EvidenceCoverageProvider {
  const cache = new Map<GraphCapability, EvidenceCapabilityCoverage>();

  return {
    available: true,
    evaluate: (capability: GraphCapability): EvidenceCapabilityCoverage => {
      const cached = cache.get(capability);

      if (cached) {
        return cached;
      }

      const value = freshness
        ? evaluator.evaluate(capability, { freshness })
        : evaluator.evaluate(capability);

      const mapped: EvidenceCapabilityCoverage = {
        status: value.status,
        negativeClaimSafe: value.negativeClaimSafe,
        reasons: [...value.reasons],
      };

      cache.set(capability, mapped);

      return mapped;
    },
  };
}

export interface ProjectEvidenceFactsInput extends EvidenceFactsInput {
  coverageSnapshot?: GraphCoverageSnapshot | null;
  crossServiceSnapshot?: CrossServiceSnapshot | null;
  fleetSnapshot?: FleetSnapshot | null;
  evaluator?: GraphCoverageEvaluator | null;
  /** Full freshness result used to evaluate coverage for negative claims. */
  coverageFreshness?: FreshnessCheckResult | null;
}

/**
 * Assemble the evidence facts for a loaded project.
 *
 * `coverage`, `gaps`, `fleet` and `crossService` are derived from the persisted
 * snapshots; callers may still override them explicitly (fixtures do).
 */
export function buildProjectEvidenceFacts(input: ProjectEvidenceFactsInput): EvidenceFacts {
  const coverageSnapshot = input.coverageSnapshot ?? input.evaluator?.currentSnapshot ?? null;

  const coverage =
    input.coverage ??
    (input.evaluator
      ? createCoverageProvider(input.evaluator, input.coverageFreshness ?? null)
      : null);

  const gaps = input.gaps ?? [
    ...gapsFromCoverageSnapshot(coverageSnapshot),
    ...gapsFromCrossServiceSnapshot(input.crossServiceSnapshot ?? null),
  ];

  const fleet = input.fleet ?? fleetFactsFromSnapshot(input.fleetSnapshot ?? null);

  const crossService =
    input.crossService ??
    crossServiceFactsFromSnapshot(input.crossServiceSnapshot ?? null, input.evaluator ?? null);

  return buildEvidenceFacts({
    ...input,
    coverage,
    gaps,
    fleet,
    crossService,
  });
}
