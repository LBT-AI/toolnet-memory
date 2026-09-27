/*
 * Phase 79 — trace import pipeline.
 *
 * Staged and atomic by default:
 *
 *   parse -> detect -> normalize -> sanitize -> map to static identity ->
 *   validate against the static graph -> commit
 *
 * A rejected import changes nothing. Partial import is opt-in and always
 * reported with a rejected-event count.
 *
 * No source is executed, no process is instrumented, no network access happens.
 */

import { payloadBytes, structuralDigest } from './sanitize.js';

import { runtimeCompatibility } from './identity.js';

import { resolveRuntimeTraceLimits, type RuntimeTraceLimits } from './limits.js';

import { buildSymbolMatchIndex } from './matcher.js';

import { buildStaticGraphIndex, validateTraceDocument } from './static-validator.js';

import {
  RuntimeTraceError,
  type FleetParticipantRef,
  type RuntimeTraceImportInput,
  type RuntimeTraceImportResult,
  type RuntimeTraceSession,
  type RuntimeTraceSessionRecord,
  type TraceInputFormat,
} from './types.js';

import { selectAdapter } from './adapters/index.js';

import type { RuntimeTraceDiagnosticCode } from './diagnostics.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

export interface TraceImportPlanInput {
  projectId: string;
  graph: CodeGraphStore;
  /** Generation of the graph these observations are validated against. */
  graphGeneration?: string;
  input: RuntimeTraceImportInput;
  /**
   * Registered Fleet participants. Used only to resolve an exact cross-project
   * runtime target; a matching URL string is never enough.
   */
  fleetParticipants?: readonly FleetParticipantRef[];
  limits?: Partial<RuntimeTraceLimits>;
  now?: () => Date;
}

export interface TraceImportPlan {
  session: RuntimeTraceSession;
  record: RuntimeTraceSessionRecord;
  result: RuntimeTraceImportResult;
}

const SAFE_SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/u;

const MAX_DIGEST_NODES = 200_000;

function failure(
  code: RuntimeTraceDiagnosticCode | string,
  message: string,
  diagnostics: RuntimeTraceDiagnosticCode[] = []
): RuntimeTraceImportResult {
  return {
    ok: false,
    acceptedEvents: 0,
    rejectedEvents: 0,
    deduplicatedEvents: 0,
    observations: { calls: 0, http: 0, events: 0 },
    generation: { compatibility: 'unknown' },
    diagnostics,
    error: { code, message },
  };
}

function resolvePayload(input: RuntimeTraceImportInput): unknown {
  if (input.json !== undefined) {
    return JSON.parse(input.json) as unknown;
  }

  if (input.trace !== undefined) {
    return input.trace;
  }

  throw new RuntimeTraceError('TRACE_SCHEMA_INVALID', 'Trace import requires a payload.');
}

/** Cheap pre-limit so an oversized events array is refused before any copying. */
function preflightEventCount(payload: unknown, limits: RuntimeTraceLimits): number | undefined {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const events = (payload as Record<string, unknown>)['events'];

  if (!Array.isArray(events)) {
    return undefined;
  }

  if (events.length > limits.maxEventsPerImport) {
    throw new RuntimeTraceError(
      'TRACE_LIMIT_EXCEEDED',
      `Trace declares ${events.length} events; the limit is ${limits.maxEventsPerImport}.`
    );
  }

  return events.length;
}

/**
 * Pure planning step: no persistence, no graph mutation.
 *
 * Deterministic for a given payload, graph and generation — which is what makes
 * standalone and daemon imports equivalent.
 */
export function planTraceImport(
  options: TraceImportPlanInput
): TraceImportPlan | RuntimeTraceImportResult {
  const limits = resolveRuntimeTraceLimits(options.limits);

  const now = options.now ?? ((): Date => new Date());

  /*
   * Byte size is checked before parsing so an oversized payload is refused
   * rather than parsed, and a raw text payload is never duplicated in memory.
   */
  if (options.input.json !== undefined) {
    const bytes = payloadBytes(options.input.json);

    if (bytes > limits.maxTraceBytes) {
      return failure(
        'TRACE_LIMIT_EXCEEDED',
        `Trace payload is ${bytes} bytes; the limit is ${limits.maxTraceBytes}.`
      );
    }
  }

  let payload: unknown;

  try {
    payload = resolvePayload(options.input);
  } catch (error) {
    if (error instanceof RuntimeTraceError) {
      return failure(error.code, error.message);
    }

    return failure('TRACE_NOT_JSON', 'Trace payload is not valid JSON.');
  }

  /*
   * A caller-supplied session id becomes a storage key, so it is validated as a
   * safe identifier before it can reach the filesystem namespace.
   */
  if (options.input.sessionId !== undefined && !SAFE_SESSION_ID.test(options.input.sessionId)) {
    return failure('TRACE_SCHEMA_INVALID', 'sessionId must match [A-Za-z0-9_-]{1,64}.');
  }

  let adapterId = 'unknown';

  try {
    const adapter = selectAdapter(payload, options.input.format ?? 'auto');

    adapterId = adapter.id;

    preflightEventCount(payload, limits);

    const sessionId =
      options.input.sessionId ??
      `rts-${structuralDigest(payload, {
        maxDepth: limits.maxNestingDepth,
        maxNodes: MAX_DIGEST_NODES,
      })}`;

    const converted = adapter.convert(payload, {
      projectId: options.projectId,
      sessionId,
      limits,
    });

    /* Project identity is validated, never reattributed by service name. */
    if (converted.projectId && converted.projectId !== options.projectId) {
      return failure(
        'TRACE_PROJECT_MISMATCH',
        `Trace declares project ${converted.projectId} but is being imported into ${options.projectId}.`
      );
    }

    if (options.input.expectedProjectId && options.input.expectedProjectId !== options.projectId) {
      return failure(
        'TRACE_PROJECT_MISMATCH',
        `Trace expects project ${options.input.expectedProjectId} but is being imported into ${options.projectId}.`
      );
    }

    /* Within-import duplicate spans (exporter retries) collapse here. */
    const byEventId = new Map<string, (typeof converted.events)[number]>();

    for (const event of converted.events) {
      if (!byEventId.has(event.eventId)) {
        byEventId.set(event.eventId, event);
      }
    }

    const events = [...byEventId.values()].sort((left, right) =>
      left.eventId.localeCompare(right.eventId)
    );

    const deduplicated = converted.events.length - events.length;

    if (events.length === 0 && converted.rejected > 0 && options.input.allowPartial !== true) {
      return failure(
        'TRACE_SCHEMA_INVALID',
        `Trace contained ${converted.rejected} unusable event(s) and no usable events.`,
        converted.diagnostics
      );
    }

    const startedAt = converted.startedAt;

    const endedAt = converted.endedAt;

    if (startedAt && endedAt) {
      const duration = Date.parse(endedAt) - Date.parse(startedAt);

      if (Number.isFinite(duration) && duration > limits.maxSessionDurationMs) {
        return failure(
          'TRACE_LIMIT_EXCEEDED',
          `Trace spans ${duration}ms; the session limit is ${limits.maxSessionDurationMs}ms.`
        );
      }
    }

    const declaredGeneration = converted.graphGeneration ?? options.input.expectedGeneration;

    const compatibility = runtimeCompatibility(
      declaredGeneration,
      options.graphGeneration,
      converted.sourceManifestHash
    );

    /*
     * The session id is content-derived (or caller-supplied), so re-importing
     * the same payload resolves to the same session and is a no-op.
     */
    const diagnostics = new Set<RuntimeTraceDiagnosticCode>(converted.diagnostics);

    if (compatibility === 'stale') {
      diagnostics.add('TRACE_GENERATION_STALE');
    } else if (compatibility === 'unknown') {
      diagnostics.add('TRACE_GENERATION_UNKNOWN');
    }

    const matches = buildSymbolMatchIndex(options.graph, options.projectId);

    const index = buildStaticGraphIndex(options.graph, options.projectId, matches);

    const validated = validateTraceDocument({
      events,
      index,
      projectId: options.projectId,
      ...(declaredGeneration ? { traceGeneration: declaredGeneration } : {}),
      ...(options.graphGeneration ? { graphGeneration: options.graphGeneration } : {}),
      ...(converted.sourceManifestHash ? { sourceManifestHash: converted.sourceManifestHash } : {}),
      ...(options.fleetParticipants ? { fleetParticipants: options.fleetParticipants } : {}),
    });

    for (const code of validated.diagnostics) {
      diagnostics.add(code);
    }

    const session: RuntimeTraceSession = {
      id: sessionId,
      projectId: options.projectId,
      source: adapter.source,
      ...(startedAt ? { startedAt } : {}),
      ...(endedAt ? { endedAt } : {}),
      ...(declaredGeneration ? { graphGeneration: declaredGeneration } : {}),
      ...(converted.sourceManifestHash ? { sourceManifestHash: converted.sourceManifestHash } : {}),
      environment: options.input.environment ?? converted.environment,
      importedAt: now().toISOString(),
      adapter: adapterId,
      eventCount: events.length + converted.rejected,
      acceptedEvents: events.length,
      rejectedEvents: converted.rejected,
      deduplicatedEvents: deduplicated,
      compatibility,
    };

    const record: RuntimeTraceSessionRecord = {
      session,
      observations: validated.observations,
    };

    const observations = validated.observations;

    const result: RuntimeTraceImportResult = {
      ok: true,
      sessionId: session.id,
      session,
      acceptedEvents: session.acceptedEvents,
      rejectedEvents: session.rejectedEvents,
      deduplicatedEvents: session.deduplicatedEvents,
      observations: {
        calls: observations.filter(
          (observation) => observation.kind === 'call' || observation.kind === 'dispatch'
        ).length,
        http: observations.filter((observation) => observation.kind === 'http').length,
        events: observations.filter(
          (observation) =>
            observation.kind === 'event_emit' ||
            observation.kind === 'event_consume' ||
            observation.kind === 'event_flow'
        ).length,
      },
      generation: {
        ...(declaredGeneration ? { trace: declaredGeneration } : {}),
        ...(options.graphGeneration ? { graph: options.graphGeneration } : {}),
        compatibility,
      },
      diagnostics: [...diagnostics].sort() as RuntimeTraceDiagnosticCode[],
    };

    return { session, record, result };
  } catch (error) {
    if (error instanceof RuntimeTraceError) {
      return failure(error.code, error.message);
    }

    return failure(
      'TRACE_SCHEMA_INVALID',
      `Trace payload could not be processed by the ${adapterId} adapter.`
    );
  }
}

export function isTraceImportPlan(
  value: TraceImportPlan | RuntimeTraceImportResult
): value is TraceImportPlan {
  return (value as TraceImportPlan).session !== undefined;
}

export type { TraceInputFormat };
