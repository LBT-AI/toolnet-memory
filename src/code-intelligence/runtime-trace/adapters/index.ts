/*
 * Phase 79 — trace adapter registry.
 *
 * Adding an adapter (Chrome trace, Jaeger export, Zipkin export) means adding a
 * module here; nothing else in the pipeline changes.
 */

import { RuntimeTraceError, type TraceInputFormat } from '../types.js';

import { otelJsonAdapter } from './otel.js';

import { toolnetJsonAdapter } from './toolnet-json.js';

import { ownValue } from '../sanitize.js';

import type { RawTraceAdapter } from './types.js';

export { OTEL_ATTRIBUTE_ALLOWLIST } from './otel.js';

export { toolnetJsonAdapter } from './toolnet-json.js';

export { otelJsonAdapter } from './otel.js';

export { TRACE_VERSION, UNSUPPORTED_TRACE_VERSIONS } from './types.js';

export type { AdapterContext, AdapterResult, RawTraceAdapter } from './types.js';

export const TRACE_ADAPTERS: readonly RawTraceAdapter[] = [toolnetJsonAdapter, otelJsonAdapter];

export function traceAdapterIds(): string[] {
  return TRACE_ADAPTERS.map((adapter) => adapter.id);
}

/** True when the payload looks like a JSON object/array rather than text. */
function isStructured(input: unknown): boolean {
  return input !== null && typeof input === 'object';
}

/**
 * Select the adapter for a payload.
 *
 * An explicit `format` is honoured without sniffing, so a caller can never be
 * surprised by auto-detection; `auto` requires a match and otherwise rejects
 * with TRACE_SCHEMA_INVALID.
 */
export function selectAdapter(input: unknown, format: TraceInputFormat = 'auto'): RawTraceAdapter {
  if (format === 'toolnet-json') {
    return toolnetJsonAdapter;
  }

  if (format === 'otel-json') {
    return otelJsonAdapter;
  }

  if (!isStructured(input)) {
    throw new RuntimeTraceError('TRACE_SCHEMA_INVALID', 'Trace payload must be a JSON object.');
  }

  const matched = TRACE_ADAPTERS.find((adapter) => {
    try {
      return adapter.detect(input);
    } catch {
      return false;
    }
  });

  if (!matched) {
    /* A `version` field that no adapter claims is an unsupported schema. */
    if (ownValue(input, 'version') !== undefined) {
      throw new RuntimeTraceError(
        'TRACE_SCHEMA_UNSUPPORTED',
        'Trace payload declares an unsupported schema version.'
      );
    }

    throw new RuntimeTraceError(
      'TRACE_SCHEMA_INVALID',
      'Trace payload does not match any supported trace format.'
    );
  }

  return matched;
}
