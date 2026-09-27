/*
 * Phase 79 — runtime observation aggregation.
 *
 * Observations are aggregated by (project, relation identity) so a hot call path
 * does not create millions of rows. An aggregate keeps a bounded sample of event
 * ids and sessions, a first/last observed timestamp and a raw count.
 *
 * The count is an observation count and nothing more: Phase 79 attaches no
 * "importance", "likelihood" or confidence semantics to it.
 */

import type { RuntimeTraceLimits } from './limits.js';

import type { RuntimeCompatibility, RuntimeObservation, RuntimeSymbolRef } from './types.js';

import type { EvidenceRuntimeFacts, EvidenceRuntimeObservation } from '../evidence/types.js';

/** Merge one observation into an existing aggregate. */
export function mergeObservation(
  existing: RuntimeObservation,
  incoming: RuntimeObservation,
  limits: RuntimeTraceLimits
): RuntimeObservation {
  const sessionIds = [...new Set([...existing.sessionIds, ...incoming.sessionIds])]
    .sort()
    .slice(0, limits.maxSessionsPerObservation);

  const sampleEventIds = [...new Set([...existing.sampleEventIds, ...incoming.sampleEventIds])]
    .sort()
    .slice(0, limits.maxObservationSamples);

  const staticEdgeIds = [...new Set([...existing.staticEdgeIds, ...incoming.staticEdgeIds])].sort();

  const diagnostics = [
    ...new Set([...existing.diagnostics, ...incoming.diagnostics]),
  ].sort() as RuntimeObservation['diagnostics'];

  /* A newer, better-known compatibility never overwrites a stale verdict. */
  const compatibility = worstCompatibility(existing.compatibility, incoming.compatibility);

  return {
    ...existing,
    staticEdgeIds,
    diagnostics,
    observationCount: existing.observationCount + incoming.observationCount,
    sessionIds,
    sessionCount: sessionIds.length,
    sampleEventIds,
    firstObservedAt:
      existing.firstObservedAt <= incoming.firstObservedAt
        ? existing.firstObservedAt
        : incoming.firstObservedAt,
    lastObservedAt:
      existing.lastObservedAt >= incoming.lastObservedAt
        ? existing.lastObservedAt
        : incoming.lastObservedAt,
    compatibility,
  };
}

const COMPATIBILITY_RANK: Record<RuntimeCompatibility, number> = {
  exact: 0,
  'source-compatible': 1,
  unknown: 2,
  stale: 3,
};

function worstCompatibility(
  left: RuntimeCompatibility,
  right: RuntimeCompatibility
): RuntimeCompatibility {
  return COMPATIBILITY_RANK[left] >= COMPATIBILITY_RANK[right] ? left : right;
}

export function mergeObservations(
  existing: readonly RuntimeObservation[],
  incoming: readonly RuntimeObservation[],
  limits: RuntimeTraceLimits
): { merged: RuntimeObservation[]; added: number; updated: number } {
  const byId = new Map<string, RuntimeObservation>();

  for (const observation of existing) {
    byId.set(observation.id, observation);
  }

  let added = 0;
  let updated = 0;

  for (const observation of incoming) {
    const current = byId.get(observation.id);

    if (current) {
      byId.set(observation.id, mergeObservation(current, observation, limits));
      updated += 1;
      continue;
    }

    byId.set(observation.id, observation);
    added += 1;
  }

  const merged = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));

  return { merged, added, updated };
}

function refMatches(ref: RuntimeSymbolRef, symbolIds: ReadonlySet<string>, name?: string): boolean {
  if (ref.symbolId && symbolIds.has(ref.symbolId)) {
    return true;
  }

  if (name && (ref.name === name || ref.qualifiedName === name)) {
    return true;
  }

  return false;
}

/** Observations touching the requested subject. */
export function relevantObservations(
  observations: readonly RuntimeObservation[],
  subject: { symbolIds?: readonly string[]; name?: string }
): RuntimeObservation[] {
  const symbolIds = new Set(subject.symbolIds ?? []);

  if (symbolIds.size === 0 && !subject.name) {
    return [];
  }

  return observations.filter((observation) => {
    if (observation.sourceSymbolId && symbolIds.has(observation.sourceSymbolId)) {
      return true;
    }

    if (observation.targetSymbolId && symbolIds.has(observation.targetSymbolId)) {
      return true;
    }

    return (
      refMatches(observation.source, symbolIds, subject.name) ||
      refMatches(observation.target, symbolIds, subject.name)
    );
  });
}

/**
 * Symbols proven to have executed.
 *
 * Both endpoints count: a caller that ran and a callee that ran are both
 * evidence of execution. Unresolved references contribute nothing, because an
 * unresolved name is not a proven execution.
 */
export function executedSymbolIds(observations: readonly RuntimeObservation[]): string[] {
  const executed = new Set<string>();

  for (const observation of observations) {
    if (observation.sourceSymbolId) {
      executed.add(observation.sourceSymbolId);
    }

    if (observation.targetSymbolId) {
      executed.add(observation.targetSymbolId);
    }
  }

  return [...executed].sort();
}

/** Project one aggregate observation for evidence reporting (provenance kept). */
export function projectObservation(observation: RuntimeObservation): EvidenceRuntimeObservation {
  return {
    id: observation.id,
    kind: observation.kind,
    validation: observation.validation,
    observationCount: observation.observationCount,
    sessionCount: observation.sessionCount,
    firstObservedAt: observation.firstObservedAt,
    lastObservedAt: observation.lastObservedAt,
    compatibility: observation.compatibility,
    staticEdgeIds: observation.staticEdgeIds,
    source: {
      ...(observation.source.symbolId ? { symbolId: observation.source.symbolId } : {}),
      ...(observation.source.name ? { name: observation.source.name } : {}),
    },
    target: {
      ...(observation.target.symbolId ? { symbolId: observation.target.symbolId } : {}),
      ...(observation.target.name ? { name: observation.target.name } : {}),
    },
  };
}

/**
 * Build the Phase 78 runtime fact bag.
 *
 * Runtime absence is never absence: facts carry no signal that can make a
 * claim safer. Runtime data can corroborate a positive finding and can block a
 * dead-code claim for a symbol that provably executed.
 */
export function buildEvidenceRuntimeFacts(input: {
  observations: readonly RuntimeObservation[];
  sessions: number;
  subject?: { symbolIds?: readonly string[]; name?: string };
  compatibility?: RuntimeCompatibility;
  graphGeneration?: string;
}): EvidenceRuntimeFacts {
  const relevant = input.subject
    ? relevantObservations(input.observations, input.subject).map(projectObservation)
    : [];

  const compatibility =
    input.compatibility ??
    worstOf(input.observations.map((observation) => observation.compatibility));

  return {
    available: input.observations.length > 0,
    compatibility,
    ...(input.graphGeneration ? { graphGeneration: input.graphGeneration } : {}),
    sessions: input.sessions,
    observations: input.observations.length,
    relevant,
    executedSymbolIds: executedSymbolIds(input.observations),
    reasons: [],
  };
}

function worstOf(values: readonly RuntimeCompatibility[]): RuntimeCompatibility {
  if (values.length === 0) {
    return 'unknown';
  }

  return values.reduce((worst, value) =>
    COMPATIBILITY_RANK[value] > COMPATIBILITY_RANK[worst] ? value : worst
  );
}
