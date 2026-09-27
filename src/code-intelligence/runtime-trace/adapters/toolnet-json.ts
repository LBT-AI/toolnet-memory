/*
 * Phase 79 — ToolNet Runtime Trace JSON adapter.
 *
 * Deterministic schema, strictly validated:
 *
 *   {
 *     "version": 1,
 *     "projectId": "...",
 *     "generation": "...",
 *     "events": [ { "type": "call" | "http" | "event_emit" | "event_consume", ... } ]
 *   }
 *
 * An unknown version is rejected with TRACE_SCHEMA_UNSUPPORTED rather than
 * being guessed at.
 */

import {
  ownNumber,
  ownValue,
  sanitizeAttributes,
  canonicalizeHttpPath,
  hashCorrelation,
} from '../sanitize.js';

import { RuntimeTraceError } from '../types.js';

import type { RuntimeTraceDiagnosticCode } from '../diagnostics.js';

import type { RuntimeTraceEvent } from '../types.js';

import {
  eventIdFor,
  readArray,
  readBoolean,
  readNumber,
  readObject,
  readString,
  readSymbolRef,
} from './shared.js';

import {
  TRACE_VERSION,
  type AdapterContext,
  type AdapterResult,
  type RawTraceAdapter,
} from './types.js';

function baseOf(
  raw: unknown,
  context: AdapterContext
): {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  timestamp?: string;
  durationMs?: number;
  serviceId?: string;
  attributes: Record<string, string>;
  diagnostics: RuntimeTraceDiagnosticCode[];
} {
  const traceId = readString(raw, 'traceId', 'trace_id');
  const spanId = readString(raw, 'spanId', 'span_id');
  const parentSpanId = readString(raw, 'parentSpanId', 'parent_span_id');
  const timestamp = readString(raw, 'timestamp', 'startedAt', 'started_at');
  const durationMs = readNumber(raw, 'durationMs', 'duration_ms', 'duration');
  const serviceId = readString(raw, 'serviceId', 'service_id', 'service');

  const sanitized = sanitizeAttributes(ownValue(raw, 'attributes'), context.limits, undefined);

  const diagnostics: RuntimeTraceDiagnosticCode[] = [];

  if (sanitized.redacted) {
    diagnostics.push('TRACE_SECRET_REDACTED');
  }

  if (sanitized.dropped > 0) {
    diagnostics.push('TRACE_ATTRIBUTE_DROPPED');
  }

  return {
    ...(traceId ? { traceId } : {}),
    ...(spanId ? { spanId } : {}),
    ...(parentSpanId ? { parentSpanId } : {}),
    ...(timestamp ? { timestamp } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(serviceId ? { serviceId } : {}),
    attributes: sanitized.attributes,
    diagnostics,
  };
}

function convertEvent(
  raw: unknown,
  context: AdapterContext
): { event?: RuntimeTraceEvent; code?: RuntimeTraceDiagnosticCode } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { code: 'TRACE_SCHEMA_INVALID' };
  }

  const type = readString(raw, 'type', 'kind');

  if (!type) {
    return { code: 'TRACE_SCHEMA_INVALID' };
  }

  const base = baseOf(raw, context);

  switch (type) {
    case 'call': {
      const caller = readSymbolRef(readObject(raw, 'caller'));

      const callee = readSymbolRef(readObject(raw, 'callee'));

      if (!caller && !callee) {
        return { code: 'TRACE_SCHEMA_INVALID' };
      }

      const dispatch = readBoolean(raw, 'dispatch', 'dynamic') === true;

      return {
        event: {
          kind: 'call',
          eventId: eventIdFor({
            sessionId: context.sessionId,
            kind: 'call',
            traceId: base.traceId,
            spanId: base.spanId,
            timestamp: base.timestamp,
            source: caller?.symbolId ?? caller?.qualifiedName ?? caller?.name,
            target: callee?.symbolId ?? callee?.qualifiedName ?? callee?.name,
          }),
          sessionId: context.sessionId,
          projectId: context.projectId,
          ...base,
          caller: caller ?? {},
          callee: callee ?? {},
          dispatch,
        } as RuntimeTraceEvent,
      };
    }

    case 'http': {
      const rawPath = readString(raw, 'path', 'route', 'url', 'target');

      const path = rawPath ? canonicalizeHttpPath(rawPath) : undefined;

      if (!path) {
        return { code: 'TRACE_SCHEMA_INVALID' };
      }

      const method = (readString(raw, 'method') ?? 'GET').toUpperCase();

      const host = readString(raw, 'host', 'targetService', 'target_service');

      const targetServiceId = readString(raw, 'targetServiceId', 'target_service_id');

      const statusCode = readNumber(raw, 'statusCode', 'status_code', 'status');

      return {
        event: {
          kind: 'http',
          eventId: eventIdFor({
            sessionId: context.sessionId,
            kind: 'http',
            traceId: base.traceId,
            spanId: base.spanId,
            timestamp: base.timestamp,
            method,
            path,
          }),
          sessionId: context.sessionId,
          projectId: context.projectId,
          ...base,
          method,
          path,
          ...(host ? { host } : {}),
          ...(targetServiceId ? { targetServiceId } : {}),
          ...(statusCode !== undefined ? { statusCode } : {}),
        } as RuntimeTraceEvent,
      };
    }

    case 'event_emit':
    case 'event_consume': {
      const provider = readString(raw, 'provider', 'broker');

      const channel = readString(raw, 'channel', 'topic', 'queue');

      if (!provider || !channel) {
        return { code: 'TRACE_SCHEMA_INVALID' };
      }

      const isEmit = type === 'event_emit';

      const ref = readSymbolRef(readObject(raw, isEmit ? 'producer' : 'consumer')) ?? {};

      const rawCorrelation = readString(raw, 'correlationId', 'correlation_id', 'messageId');

      /* A correlation id can itself be sensitive: only its hash is kept. */
      const correlationId = rawCorrelation ? hashCorrelation(rawCorrelation) : undefined;

      const common = {
        eventId: eventIdFor({
          sessionId: context.sessionId,
          kind: type,
          traceId: base.traceId,
          spanId: base.spanId,
          timestamp: base.timestamp,
          provider,
          channel,
        }),
        sessionId: context.sessionId,
        projectId: context.projectId,
        ...base,
        provider,
        channel,
        ...(correlationId ? { correlationId } : {}),
      };

      return {
        event: isEmit
          ? ({ ...common, kind: 'event_emit', producer: ref } as RuntimeTraceEvent)
          : ({ ...common, kind: 'event_consume', consumer: ref } as RuntimeTraceEvent),
      };
    }

    default:
      return { code: 'TRACE_SCHEMA_INVALID' };
  }
}

export const toolnetJsonAdapter: RawTraceAdapter = {
  id: 'toolnet-json',
  source: 'toolnet',

  detect(input: unknown): boolean {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      return false;
    }

    if (!Array.isArray(ownValue(input, 'events'))) {
      return false;
    }

    const version = ownNumber(input, 'version');

    return version !== undefined;
  },

  convert(input: unknown, context: AdapterContext): AdapterResult {
    const version = ownNumber(input, 'version');

    if (version === undefined) {
      throw new RuntimeTraceError('TRACE_SCHEMA_INVALID', 'Trace payload has no version.');
    }

    if (version !== TRACE_VERSION) {
      throw new RuntimeTraceError(
        'TRACE_SCHEMA_UNSUPPORTED',
        `Unsupported ToolNet trace version ${version}; expected ${TRACE_VERSION}.`
      );
    }

    const rawEvents = readArray(input, 'events');

    if (rawEvents.length > context.limits.maxEventsPerImport) {
      throw new RuntimeTraceError(
        'TRACE_LIMIT_EXCEEDED',
        `Trace declares ${rawEvents.length} events; the limit is ${context.limits.maxEventsPerImport}.`
      );
    }

    const events: RuntimeTraceEvent[] = [];

    const diagnostics: RuntimeTraceDiagnosticCode[] = [];

    let rejected = 0;

    for (const raw of rawEvents) {
      const converted = convertEvent(raw, context);

      if (!converted.event) {
        rejected += 1;
        if (converted.code) {
          diagnostics.push(converted.code);
        }
        continue;
      }

      events.push(converted.event);
    }

    return {
      projectId: readString(input, 'projectId', 'project_id'),
      graphGeneration: readString(input, 'generation', 'graphGeneration', 'graph_generation'),
      sourceManifestHash: readString(
        input,
        'sourceManifestHash',
        'source_manifest_hash',
        'revision'
      ),
      environment: readString(input, 'environment', 'env'),
      startedAt: readString(input, 'startedAt', 'started_at'),
      endedAt: readString(input, 'endedAt', 'ended_at'),
      events,
      rejected,
      diagnostics,
    };
  },
};
