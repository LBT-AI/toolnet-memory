/*
 * Phase 79 — Runtime Trace Evidence.
 *
 * Runtime traces are EVIDENCE about what a process actually did. They are never
 * graph authority:
 *
 *   runtime observed      -> attach an observation, never rewrite a static edge
 *   runtime not observed  -> attach nothing, never invalidate a static edge
 *   runtime absent        -> never make a negative claim safer
 *
 * Static structural truth stays in the Phase 71 graph. Nothing in this module
 * mutates a CodeGraphStore, Memory, Tasks, Sessions or ADRs.
 *
 * No LLM. No embeddings. No vector database. No source execution. No process
 * instrumentation is performed by ToolNet.
 */

import type { RuntimeTraceDiagnosticCode } from './diagnostics.js';

export type RuntimeTraceSource = 'toolnet' | 'opentelemetry' | 'import';

/**
 * How well a trace's provenance lines up with the current graph.
 *
 * Deliberately categorical: there is no probabilistic score anywhere in
 * Phase 79.
 */
export type RuntimeCompatibility = 'exact' | 'source-compatible' | 'stale' | 'unknown';

export type RuntimeRelationKind =
  'call' | 'dispatch' | 'http' | 'event_emit' | 'event_consume' | 'event_flow' | 'cross_repo';

/**
 * A registered Fleet participant.
 *
 * Cross-repo runtime evidence is only asserted when a runtime target matches a
 * participant by exact identity. A shared URL string is never enough.
 */
export interface FleetParticipantRef {
  projectId: string;
  name: string;
  serviceNames?: string[];
}

/**
 * Evidence state of a runtime relation against the static graph.
 *
 * `not_in_static_graph` is a diagnostic, NEVER a contradiction: a runtime-only
 * relation usually means dynamic dispatch, reflection, generated code, an
 * unsupported parser or a stale graph.
 */
export type RuntimeValidationState =
  | 'validates_static_edge'
  | 'dynamic_dispatch'
  | 'not_in_static_graph'
  | 'identity_conflict'
  | 'unresolved'
  | 'ambiguous';

/* ------------------------------------------------------------------
 * Session
 * ------------------------------------------------------------------ */

export interface RuntimeTraceSession {
  id: string;
  projectId: string;
  source: RuntimeTraceSource;
  startedAt?: string;
  endedAt?: string;
  graphGeneration?: string;
  sourceManifestHash?: string;
  environment?: string;
  importedAt: string;
  /** Adapter that produced this session (e.g. `toolnet-json`, `otel-json`). */
  adapter: string;
  /** Counters observed while importing; never authority, only diagnostics. */
  eventCount: number;
  acceptedEvents: number;
  rejectedEvents: number;
  deduplicatedEvents: number;
  compatibility: RuntimeCompatibility;
}

/* ------------------------------------------------------------------
 * Events
 * ------------------------------------------------------------------ */

/**
 * A runtime-side symbol reference.
 *
 * `symbolId` is an exact ToolNet identity and is the only strong form.
 * Everything else must be justified by module/file evidence, never by a
 * repository-wide simple-name lookup.
 */
export interface RuntimeSymbolRef {
  symbolId?: string;
  qualifiedName?: string;
  module?: string;
  filePath?: string;
  name?: string;
}

export interface RuntimeEventBase {
  /** Deterministic event identity (see `identity.ts`). */
  eventId: string;
  sessionId: string;
  projectId: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  timestamp?: string;
  durationMs?: number;
  serviceId?: string;
  /** Sanitized allowlisted attributes only. */
  attributes: Record<string, string>;
  diagnostics: RuntimeTraceDiagnosticCode[];
}

export interface RuntimeCallEvent extends RuntimeEventBase {
  kind: 'call';
  caller: RuntimeSymbolRef;
  callee: RuntimeSymbolRef;
  /** True when instrumentation reported a dynamic/interface dispatch. */
  dispatch: boolean;
}

export interface RuntimeHttpEvent extends RuntimeEventBase {
  kind: 'http';
  method: string;
  /** Canonical path only; query strings and credentials are stripped. */
  path: string;
  host?: string;
  targetServiceId?: string;
  statusCode?: number;
}

export interface RuntimeEventEmitEvent extends RuntimeEventBase {
  kind: 'event_emit';
  provider: string;
  channel: string;
  producer: RuntimeSymbolRef;
  /** Hashed correlation identity; never a raw payload. */
  correlationId?: string;
}

export interface RuntimeEventConsumeEvent extends RuntimeEventBase {
  kind: 'event_consume';
  provider: string;
  channel: string;
  consumer: RuntimeSymbolRef;
  correlationId?: string;
}

export type RuntimeTraceEvent =
  RuntimeCallEvent | RuntimeHttpEvent | RuntimeEventEmitEvent | RuntimeEventConsumeEvent;

export type RuntimeTraceEventKind = RuntimeTraceEvent['kind'];

/* ------------------------------------------------------------------
 * Normalized document (post-adapter, pre-static-validation)
 * ------------------------------------------------------------------ */

export interface NormalizedTraceDocument {
  adapter: string;
  source: RuntimeTraceSource;
  projectId: string;
  graphGeneration?: string;
  sourceManifestHash?: string;
  environment?: string;
  startedAt?: string;
  endedAt?: string;
  events: RuntimeTraceEvent[];
  rejected: number;
  deduplicated: number;
  diagnostics: RuntimeTraceDiagnosticCode[];
}

/**
 * Persisted per-session record.
 *
 * A session keeps its OWN observation contributions, so deleting a session can
 * subtract exactly what it contributed instead of guessing.
 */
export interface RuntimeTraceSessionRecord {
  session: RuntimeTraceSession;
  observations: RuntimeObservation[];
}

/* ------------------------------------------------------------------
 * Observations
 * ------------------------------------------------------------------ */

/**
 * An aggregated runtime relation.
 *
 * `observationCount` is a raw count of deduplicated observations. It never
 * means "important", "likely" or "the only path".
 */
export interface RuntimeObservation {
  id: string;
  projectId: string;
  kind: RuntimeRelationKind;

  source: RuntimeSymbolRef;
  target: RuntimeSymbolRef;

  sourceSymbolId?: string;
  targetSymbolId?: string;

  /** Static edges this observation corroborates. Never mutated, never created. */
  staticEdgeIds: string[];

  /** Set only for `cross_repo` observations resolved through Fleet identity. */
  crossProjectId?: string;

  validation: RuntimeValidationState;
  diagnostics: RuntimeTraceDiagnosticCode[];

  observationCount: number;
  sessionIds: string[];
  sessionCount: number;
  sampleEventIds: string[];

  firstObservedAt: string;
  lastObservedAt: string;

  graphGeneration?: string;
  compatibility: RuntimeCompatibility;
}

/*
 * The runtime facts shape handed to the Phase 78 evidence layer is declared by
 * the evidence layer itself (`../evidence/types.js`) so that the evidence layer
 * never depends on this subsystem. Runtime evidence is additive: it can
 * corroborate a positive finding and can block a dead-code claim for a symbol
 * that provably executed, but it can never ground an absence.
 */

/* ------------------------------------------------------------------
 * Import surface
 * ------------------------------------------------------------------ */

export type TraceInputFormat = 'toolnet-json' | 'otel-json' | 'auto';

export interface RuntimeTraceImportInput {
  /** Structured payload (already parsed JSON value). */
  trace?: unknown;
  /** Raw JSON text. Subject to `maxTraceBytes`. */
  json?: string;
  /** Explicit adapter selection; `auto` inspects the payload. */
  format?: TraceInputFormat;
  /** Expected project id. A mismatch is rejected, never reattributed. */
  expectedProjectId?: string;
  /** Graph generation observed by the instrumented process. */
  expectedGeneration?: string;
  environment?: string;
  /** Explicit session id; otherwise derived deterministically. */
  sessionId?: string;
  /**
   * Partial imports are opt-in. Default is strict atomic: either the session is
   * imported and indexed, or it is rejected entirely.
   */
  allowPartial?: boolean;
}

export interface RuntimeTraceImportResult {
  ok: boolean;
  sessionId?: string;
  session?: RuntimeTraceSession;
  acceptedEvents: number;
  rejectedEvents: number;
  deduplicatedEvents: number;
  observations: {
    calls: number;
    http: number;
    events: number;
  };
  generation: {
    trace?: string;
    graph?: string;
    compatibility: RuntimeCompatibility;
  };
  diagnostics: RuntimeTraceDiagnosticCode[];
  /** True when the identical session was already present and nothing changed. */
  alreadyImported?: boolean;
  error?: { code: string; message: string };
}

export interface RuntimeTraceStatus {
  sessions: number;
  compatibleSessions: number;
  staleSessions: number;
  unknownSessions: number;
  observations: number;
  storedBytes: number;
  retention: {
    maxSessions: number;
    maxAgeDays: number;
    maxObservations: number;
  };
  adapters: string[];
  /** Always false in Phase 79. */
  canEstablishAbsence: false;
}

export class RuntimeTraceError extends Error {
  constructor(
    public readonly code: RuntimeTraceDiagnosticCode | string,
    message: string
  ) {
    super(message);
    this.name = 'RuntimeTraceError';
  }
}
