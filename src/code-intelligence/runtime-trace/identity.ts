/*
 * Phase 79 — deterministic runtime trace identity.
 *
 * Trace identity is derived from content, never random, so re-importing the
 * same observations is idempotent and duplicate exporter retries collapse.
 *
 * A trace session id identifies a trace payload. It is NEVER a graph identity
 * and is never used to address symbols, edges or projects.
 */

import { canonicalJson } from '../artifact/serializer.js';

import { sha256Digest } from '../artifact/integrity.js';

import type { RuntimeCompatibility, RuntimeSymbolRef, RuntimeTraceSource } from './types.js';

/**
 * Stable key for a runtime symbol reference.
 *
 * Strongest evidence wins: an exact ToolNet symbol id, then a qualified name,
 * then module/file + simple name. A bare simple name is deliberately excluded
 * because it is never strong enough to identify a symbol on its own.
 */
export function symbolRefKey(ref: RuntimeSymbolRef | undefined): string | undefined {
  if (!ref) {
    return undefined;
  }

  if (ref.symbolId) {
    return `id:${ref.symbolId}`;
  }

  if (ref.qualifiedName) {
    return `q:${ref.qualifiedName}`;
  }

  const path = ref.filePath ?? ref.module;

  if (path && ref.name) {
    return `p:${path}#${ref.name}`;
  }

  if (path) {
    return `p:${path}`;
  }

  return undefined;
}

export interface TraceEventIdentityParts {
  sessionId: string;
  kind: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  timestamp?: string;
  source?: string;
  target?: string;
  provider?: string;
  channel?: string;
  method?: string;
  path?: string;
}

/**
 * Deterministic event identity.
 *
 * `traceId` + `spanId` are the strongest inputs: an exporter retry produces the
 * same id and therefore never counts as a second observation.
 */
export function traceEventId(parts: TraceEventIdentityParts): string {
  const digest = sha256Digest(
    canonicalJson({
      session: parts.sessionId,
      kind: parts.kind,
      traceId: parts.traceId ?? null,
      spanId: parts.spanId ?? null,
      parentSpanId: parts.parentSpanId ?? null,
      timestamp: parts.timestamp ?? null,
      source: parts.source ?? null,
      target: parts.target ?? null,
      provider: parts.provider ?? null,
      channel: parts.channel ?? null,
      method: parts.method ?? null,
      path: parts.path ?? null,
    })
  );

  return `rte-${digest}`;
}

/**
 * Deterministic session identity from the normalized event set.
 *
 * Two imports of the same trace produce the same session id, so the second
 * import is recognised as already-present instead of inflating counts.
 */
export function deriveSessionId(input: {
  projectId: string;
  source: RuntimeTraceSource;
  adapter: string;
  eventIds: readonly string[];
}): string {
  const digest = sha256Digest(
    canonicalJson({
      project: input.projectId,
      source: input.source,
      adapter: input.adapter,
      events: [...input.eventIds].sort(),
    })
  );

  return `rts-${digest}`;
}

/** Deterministic aggregate observation identity. */
export function observationId(input: {
  projectId: string;
  kind: string;
  sourceKey: string;
  targetKey: string;
}): string {
  const digest = sha256Digest(
    canonicalJson({
      project: input.projectId,
      kind: input.kind,
      source: input.sourceKey,
      target: input.targetKey,
    })
  );

  return `rto-${digest}`;
}

/**
 * Compatibility of a trace against the current graph.
 *
 * Categorical by design — Phase 79 has no confidence score, and an unknown
 * generation is reported as unknown rather than optimistically matched.
 */
export function runtimeCompatibility(
  traceGeneration: string | undefined,
  graphGeneration: string | undefined,
  sourceManifestHash?: string
): RuntimeCompatibility {
  if (traceGeneration && graphGeneration) {
    return traceGeneration === graphGeneration ? 'exact' : 'stale';
  }

  if (!traceGeneration && sourceManifestHash) {
    return 'source-compatible';
  }

  return 'unknown';
}
