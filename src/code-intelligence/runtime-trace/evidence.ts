/*
 * Phase 79 — runtime trace evidence integration.
 *
 * Bridges the trace store to:
 *
 *   - MCP tools (`ingest_traces`, `runtime_trace_status`)
 *   - the Phase 78 Evidence Profile layer (Scout / Verify / Auditor)
 *
 * Everything here is derived state. Importing a trace never mutates the static
 * graph, Memory, Tasks, Sessions or ADRs, and runtime evidence never makes a
 * negative claim safer.
 */

import { planTraceImport, isTraceImportPlan, type TraceImportPlanInput } from './session.js';

import { buildEvidenceRuntimeFacts } from './observations.js';

import { resolveRuntimeTraceLimits, type RuntimeTraceLimits } from './limits.js';

import { traceAdapterIds } from './adapters/index.js';

import type { PersistentRuntimeTraceStore } from './store.js';

import type { EvidenceRuntimeFacts } from '../evidence/types.js';

import type { RuntimeTraceImportResult, RuntimeTraceStatus } from './types.js';

export interface ImportTraceSessionInput extends TraceImportPlanInput {
  store: PersistentRuntimeTraceStore;
}

/**
 * Import a trace session.
 *
 * Atomic and idempotent: the plan is computed entirely before anything is
 * written, a rejected plan writes nothing, and re-importing an identical
 * payload resolves to the same deterministic session id and is a no-op rather
 * than a second observation.
 */
export async function importTraceSession(
  options: ImportTraceSessionInput
): Promise<RuntimeTraceImportResult> {
  const planned = planTraceImport(options);

  if (!isTraceImportPlan(planned)) {
    return planned;
  }

  const { store } = options;

  if (await store.hasSession(options.projectId, planned.session.id)) {
    return {
      ...planned.result,
      acceptedEvents: 0,
      deduplicatedEvents: planned.session.eventCount,
      alreadyImported: true,
      diagnostics: [...new Set([...planned.result.diagnostics, 'TRACE_EVENT_DUPLICATE' as const])],
    };
  }

  await store.commitSession(options.projectId, planned.record);

  return planned.result;
}

export interface RuntimeTraceFactsInput {
  store: PersistentRuntimeTraceStore;
  projectId: string;
  graphGeneration?: string;
  subject?: { symbolIds?: readonly string[]; name?: string };
  limits?: Partial<RuntimeTraceLimits>;
}

/**
 * Load runtime facts for the evidence layer.
 *
 * When no trace has ever been imported the result is `available: false` with
 * empty facts — never a signal that anything "does not exist".
 */
export async function loadRuntimeTraceFacts(
  input: RuntimeTraceFactsInput
): Promise<EvidenceRuntimeFacts> {
  const [observations, sessions] = await Promise.all([
    input.store.loadObservations(input.projectId),
    input.store.loadSessionSummaries(input.projectId),
  ]);

  if (sessions.length === 0) {
    return {
      available: false,
      compatibility: 'unknown',
      ...(input.graphGeneration ? { graphGeneration: input.graphGeneration } : {}),
      sessions: 0,
      observations: 0,
      relevant: [],
      executedSymbolIds: [],
      reasons: [],
    };
  }

  return buildEvidenceRuntimeFacts({
    observations,
    sessions: sessions.length,
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.graphGeneration ? { graphGeneration: input.graphGeneration } : {}),
  });
}

export interface RuntimeTraceStatusInput {
  store: PersistentRuntimeTraceStore;
  projectId: string;
  limits?: Partial<RuntimeTraceLimits>;
  /** Bounded prune is opt-in; status is read-only by default. */
  prune?: boolean;
  maxAgeDays?: number;
  maxSessions?: number;
}

export async function runtimeTraceStatus(
  input: RuntimeTraceStatusInput
): Promise<RuntimeTraceStatus> {
  const limits = resolveRuntimeTraceLimits(input.limits);

  const sessions = await input.store.loadSessionSummaries(input.projectId);

  const observations = await input.store.loadObservations(input.projectId);

  const bytes = await input.store.storageBytes(input.projectId);

  return {
    sessions: sessions.length,
    compatibleSessions: sessions.filter((session) => session.compatibility === 'exact').length,
    staleSessions: sessions.filter((session) => session.compatibility === 'stale').length,
    unknownSessions: sessions.filter(
      (session) =>
        session.compatibility === 'unknown' || session.compatibility === 'source-compatible'
    ).length,
    observations: observations.length,
    storedBytes: bytes,
    retention: {
      maxSessions: input.maxSessions ?? limits.maxStoredSessions,
      maxAgeDays: input.maxAgeDays ?? limits.maxSessionAgeDays,
      maxObservations: limits.maxStoredObservations,
    },
    adapters: traceAdapterIds(),
    canEstablishAbsence: false,
  };
}
