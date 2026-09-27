/*
 * Phase 79 — Runtime Trace Evidence barrel.
 *
 * Runtime traces corroborate or extend the static graph; they never replace it.
 *
 *   runtime observed      -> attach an observation
 *   runtime not observed  -> attach nothing (NEVER invalidate a static edge)
 *   runtime absent        -> never makes a negative claim safer
 *
 * Derived state only: no LLM, no embeddings, no vector database, no source
 * execution, no process instrumentation and no network access.
 */

export * from './types.js';

export {
  RUNTIME_TRACE_LIMITS,
  resolveRuntimeTraceLimits,
  type RuntimeTraceLimits,
} from './limits.js';

export {
  RUNTIME_TRACE_BLOCKING_DIAGNOSTICS,
  RUNTIME_TRACE_DIAGNOSTICS,
  dedupeDiagnostics,
  type RuntimeTraceDiagnosticCode,
} from './diagnostics.js';

export {
  REDACTION_MARKER,
  canonicalizeHttpPath,
  containsSecretValue,
  hashCorrelation,
  isForbiddenKey,
  isSecretKey,
  ownNumber,
  ownString,
  ownValue,
  payloadBytes,
  redactValue,
  safeClone,
  sanitizeAttributes,
  structuralDigest,
  type SanitizedAttributes,
} from './sanitize.js';

export {
  deriveSessionId,
  observationId,
  runtimeCompatibility,
  symbolRefKey,
  traceEventId,
} from './identity.js';

export {
  buildSymbolMatchIndex,
  matchOwnSymbol,
  matchServiceRef,
  matchSymbolRef,
  type MatchBasis,
  type ServiceMatch,
  type SymbolMatch,
  type SymbolMatchIndex,
} from './matcher.js';

export {
  buildStaticGraphIndex,
  emptyRuntimeFacts,
  findEventSymbol,
  findRouteSymbol,
  matchFleetParticipant,
  validateTraceDocument,
  type StaticGraphIndex,
  type ValidatedTraceDocument,
} from './static-validator.js';

export {
  buildEvidenceRuntimeFacts,
  executedSymbolIds,
  mergeObservation,
  mergeObservations,
  projectObservation,
  relevantObservations,
} from './observations.js';

export {
  isTraceImportPlan,
  planTraceImport,
  type TraceImportPlan,
  type TraceImportPlanInput,
} from './session.js';

export { PersistentRuntimeTraceStore } from './store.js';

export { fleetParticipantsFromSnapshot } from './fleet.js';

export {
  applyRuntimeTraceRetention,
  type RuntimeTraceRetentionOptions,
  type RuntimeTraceRetentionResult,
} from './retention.js';

export {
  importTraceSession,
  loadRuntimeTraceFacts,
  runtimeTraceStatus,
  type ImportTraceSessionInput,
  type RuntimeTraceFactsInput,
  type RuntimeTraceStatusInput,
} from './evidence.js';

export {
  OTEL_ATTRIBUTE_ALLOWLIST,
  TRACE_ADAPTERS,
  TRACE_VERSION,
  UNSUPPORTED_TRACE_VERSIONS,
  otelJsonAdapter,
  selectAdapter,
  toolnetJsonAdapter,
  traceAdapterIds,
  type AdapterContext,
  type AdapterResult,
  type RawTraceAdapter,
} from './adapters/index.js';
