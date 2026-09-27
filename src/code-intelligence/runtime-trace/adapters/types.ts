/*
 * Phase 79 — trace adapter contract.
 *
 * An adapter is a passive, deterministic translator from an explicit trace
 * payload to normalized ToolNet events. Adapters never fetch a URL, never read
 * the filesystem, never execute source and never instrument a process.
 */

import type { RuntimeTraceDiagnosticCode } from '../diagnostics.js';

import type { RuntimeTraceLimits } from '../limits.js';

import type { RuntimeTraceEvent, RuntimeTraceSource } from '../types.js';

/** ToolNet Runtime Trace JSON schema version supported by this build. */
export const TRACE_VERSION = 1;

/** ToolNet Runtime Trace JSON schema versions this build refuses. */
export const UNSUPPORTED_TRACE_VERSIONS: readonly number[] = [0, 2];

export interface AdapterContext {
  projectId: string;
  /** Content-derived session scope, available before events are built. */
  sessionId: string;
  limits: RuntimeTraceLimits;
}

export interface AdapterResult {
  /** Project identity declared by the payload, when it declares one. */
  projectId?: string;
  graphGeneration?: string;
  sourceManifestHash?: string;
  environment?: string;
  startedAt?: string;
  endedAt?: string;
  events: RuntimeTraceEvent[];
  rejected: number;
  diagnostics: RuntimeTraceDiagnosticCode[];
}

export interface RawTraceAdapter {
  /** Stable adapter id, also used in the trace store record. */
  readonly id: string;
  readonly source: RuntimeTraceSource;
  /** Cheap structural detection. Must not throw on hostile input. */
  detect(input: unknown): boolean;
  /** Convert a payload. Must not throw for well-formed JSON shapes. */
  convert(input: unknown, context: AdapterContext): AdapterResult;
}

export function emptyAdapterResult(diagnostics: RuntimeTraceDiagnosticCode[] = []): AdapterResult {
  return { events: [], rejected: 0, diagnostics };
}
