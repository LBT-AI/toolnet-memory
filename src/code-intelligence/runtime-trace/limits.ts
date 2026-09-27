/*
 * Phase 79 — central runtime trace limits.
 *
 * Trace ingestion is untrusted input. Every bound the parser, normalizer,
 * observation aggregator and retention use lives here, so no code path can
 * accept unbounded JSON, unbounded attribute values or unbounded growth.
 */

export interface RuntimeTraceLimits {
  /** Maximum accepted raw trace payload size in bytes. */
  maxTraceBytes: number;

  /** Maximum events accepted from one import. */
  maxEventsPerImport: number;

  /** Maximum sanitized attributes kept per event. */
  maxAttributesPerEvent: number;

  /** Maximum length of one sanitized attribute value. */
  maxAttributeLength: number;

  /** Maximum accepted span/session duration in milliseconds. */
  maxSessionDurationMs: number;

  /** Maximum JSON nesting depth walked while sanitizing. */
  maxNestingDepth: number;

  /** Maximum events referenced by one aggregate observation sample. */
  maxObservationSamples: number;

  /** Maximum sessions recorded per aggregate observation. */
  maxSessionsPerObservation: number;

  /* --- retention --- */

  /** Sessions retained per project. */
  maxStoredSessions: number;

  /** Observation aggregates retained per project. */
  maxStoredObservations: number;

  /** Sessions older than this (by import time) are prunable. */
  maxSessionAgeDays: number;

  /** Maximum stored trace bytes per project before forced pruning. */
  maxStoredBytes: number;

  /** Observations swept in a single prune pass. */
  maxPruneBatch: number;
}

export const RUNTIME_TRACE_LIMITS: RuntimeTraceLimits = {
  maxTraceBytes: 32 * 1024 * 1024,
  maxEventsPerImport: 50_000,
  maxAttributesPerEvent: 24,
  maxAttributeLength: 512,
  maxSessionDurationMs: 24 * 60 * 60 * 1000,
  maxNestingDepth: 8,
  maxObservationSamples: 8,
  maxSessionsPerObservation: 16,

  maxStoredSessions: 200,
  maxStoredObservations: 20_000,
  maxSessionAgeDays: 30,
  maxStoredBytes: 64 * 1024 * 1024,
  maxPruneBatch: 1_000,
};

/**
 * Resolve effective limits. Every override must be a positive safe integer and
 * may only narrow the central ceiling, never widen it.
 */
export function resolveRuntimeTraceLimits(
  overrides: Partial<RuntimeTraceLimits> = {}
): RuntimeTraceLimits {
  const narrow = (key: keyof RuntimeTraceLimits): number => {
    const ceiling = RUNTIME_TRACE_LIMITS[key];
    const value = overrides[key];

    if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
      return ceiling;
    }

    return Math.min(value, ceiling);
  };

  return {
    maxTraceBytes: narrow('maxTraceBytes'),
    maxEventsPerImport: narrow('maxEventsPerImport'),
    maxAttributesPerEvent: narrow('maxAttributesPerEvent'),
    maxAttributeLength: narrow('maxAttributeLength'),
    maxSessionDurationMs: narrow('maxSessionDurationMs'),
    maxNestingDepth: narrow('maxNestingDepth'),
    maxObservationSamples: narrow('maxObservationSamples'),
    maxSessionsPerObservation: narrow('maxSessionsPerObservation'),
    maxStoredSessions: narrow('maxStoredSessions'),
    maxStoredObservations: narrow('maxStoredObservations'),
    maxSessionAgeDays: narrow('maxSessionAgeDays'),
    maxStoredBytes: narrow('maxStoredBytes'),
    maxPruneBatch: narrow('maxPruneBatch'),
  };
}
