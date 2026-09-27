/*
 * Phase 79 — runtime trace diagnostic codes.
 *
 * Every rejected event, unresolved mapping and non-validating relation carries
 * a machine-readable code. Prose is never the only signal, and no diagnostic
 * may ever be softened into "runtime confirmed" or "runtime absent".
 */

export const RUNTIME_TRACE_DIAGNOSTICS = [
  /* Schema / input */
  'TRACE_SCHEMA_UNSUPPORTED',
  'TRACE_SCHEMA_INVALID',
  'TRACE_LIMIT_EXCEEDED',
  'TRACE_DEPTH_EXCEEDED',
  'TRACE_NOT_JSON',

  /* Identity */
  'TRACE_PROJECT_MISMATCH',
  'TRACE_SYMBOL_UNRESOLVED',
  'TRACE_SYMBOL_AMBIGUOUS',
  'TRACE_SERVICE_UNRESOLVED',
  'TRACE_IDENTITY_CONFLICT',

  /* Relations */
  'RUNTIME_OBSERVED',
  'RUNTIME_DISPATCH_OBSERVED',
  'RUNTIME_RELATION_NOT_IN_STATIC_GRAPH',
  'RUNTIME_IDENTITY_CONFLICT',
  'RUNTIME_EVENT_UNCORRELATED',
  'RUNTIME_SYMBOL_OBSERVED',

  /* Generation / provenance */
  'TRACE_GENERATION_STALE',
  'TRACE_GENERATION_UNKNOWN',

  /* Privacy */
  'TRACE_SECRET_REDACTED',
  'TRACE_ATTRIBUTE_DROPPED',

  /* Dedupe */
  'TRACE_EVENT_DUPLICATE',

  /* Retention */
  'TRACE_RETENTION_APPLIED',
] as const;

export type RuntimeTraceDiagnosticCode = (typeof RUNTIME_TRACE_DIAGNOSTICS)[number];

/** Diagnostics that must never be hidden behind prose. */
export const RUNTIME_TRACE_BLOCKING_DIAGNOSTICS: readonly RuntimeTraceDiagnosticCode[] = [
  'TRACE_SCHEMA_UNSUPPORTED',
  'TRACE_LIMIT_EXCEEDED',
  'TRACE_PROJECT_MISMATCH',
  'TRACE_SYMBOL_AMBIGUOUS',
  'TRACE_IDENTITY_CONFLICT',
  'TRACE_SERVICE_UNRESOLVED',
  'TRACE_GENERATION_STALE',
  'RUNTIME_RELATION_NOT_IN_STATIC_GRAPH',
  'RUNTIME_IDENTITY_CONFLICT',
  'RUNTIME_EVENT_UNCORRELATED',
];

export function dedupeDiagnostics(codes: readonly string[]): RuntimeTraceDiagnosticCode[] {
  const seen = new Set<string>();

  const output: RuntimeTraceDiagnosticCode[] = [];

  for (const code of codes) {
    if (!seen.has(code)) {
      seen.add(code);
      output.push(code as RuntimeTraceDiagnosticCode);
    }
  }

  return output;
}
