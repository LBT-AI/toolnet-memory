/*
 * Phase 79 — OpenTelemetry (OTLP JSON) trace adapter.
 *
 * Passive parser: it accepts already-exported span records. It does NOT require
 * the OpenTelemetry SDK, a collector or any network access.
 *
 * Only allowlisted semantic-convention attributes survive. Request/response
 * bodies, headers, cookies, authorizations, database statements and arbitrary
 * attributes are dropped or redacted before anything is persisted.
 */

import {
  redactValue,
  sanitizeAttributes,
  canonicalizeHttpPath,
  hashCorrelation,
  ownValue,
} from '../sanitize.js';

import type { RuntimeTraceDiagnosticCode } from '../diagnostics.js';

import type { RuntimeSymbolRef, RuntimeTraceEvent } from '../types.js';

import { eventIdFor, readArray, readNumber, readObject, readString } from './shared.js';

import type { AdapterContext, AdapterResult, RawTraceAdapter } from './types.js';

/**
 * Safe semantic-convention allowlist.
 *
 * Anything not listed here is dropped. Notably absent by design: request and
 * response headers/bodies, `db.statement`, `url.query`, cookies and any
 * application-specific attribute.
 */
export const OTEL_ATTRIBUTE_ALLOWLIST: readonly string[] = [
  'service.name',
  'service.version',
  'service.instance.id',
  'deployment.environment',
  'deployment.environment.name',
  'telemetry.sdk.name',
  'telemetry.sdk.language',
  'otel.scope.name',
  'otel.library.name',
  'span.kind',
  'http.request.method',
  'http.method',
  'http.route',
  'http.target',
  'url.path',
  'url.full',
  'url.scheme',
  'server.address',
  'server.port',
  'net.peer.name',
  'net.peer.port',
  'http.host',
  'http.response.status_code',
  'http.status_code',
  'network.protocol.version',
  'rpc.system',
  'rpc.service',
  'rpc.method',
  'messaging.system',
  'messaging.destination',
  'messaging.destination.name',
  'messaging.operation',
  'messaging.client_id',
  'code.function',
  'code.namespace',
  'code.filepath',
  'code.lineno',
];

/** Attribute keys that only contribute to identity, never to stored metadata. */
const IDENTITY_KEYS = new Set([
  'service.name',
  'code.function',
  'code.namespace',
  'code.filepath',
  'http.request.method',
  'http.method',
  'http.route',
  'http.target',
  'url.path',
  'url.full',
  'server.address',
  'net.peer.name',
  'http.host',
  'http.response.status_code',
  'http.status_code',
  'rpc.service',
  'rpc.method',
  'rpc.system',
  'messaging.system',
  'messaging.destination',
  'messaging.destination.name',
  'messaging.operation',
  'messaging.client_id',
  'span.kind',
]);

function decodeScalar(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }

  const stringValue = ownValue(value, 'stringValue');

  if (typeof stringValue === 'string') {
    return stringValue;
  }

  const boolValue = ownValue(value, 'boolValue');

  if (typeof boolValue === 'boolean') {
    return boolValue ? 'true' : 'false';
  }

  const intValue = ownValue(value, 'intValue');

  if (typeof intValue === 'string' || typeof intValue === 'number') {
    return String(intValue);
  }

  const doubleValue = ownValue(value, 'doubleValue');

  if (typeof doubleValue === 'number') {
    return String(doubleValue);
  }

  const bytesValue = ownValue(value, 'bytesValue');

  if (typeof bytesValue === 'string') {
    return bytesValue;
  }

  if (Array.isArray(ownValue(value, 'arrayValue')) || ownValue(value, 'kvlistValue')) {
    return 'structured';
  }

  return undefined;
}

/** Flatten an OTLP KeyValue list into a plain bounded record. */
function flattenAttributes(raw: unknown): Record<string, string> {
  const output: Record<string, string> = {};

  if (!Array.isArray(raw)) {
    return output;
  }

  for (const entry of raw) {
    const key = readString(entry, 'key');

    if (!key) {
      continue;
    }

    const decoded = decodeScalar(ownValue(entry, 'value'));

    if (decoded === undefined) {
      continue;
    }

    Object.defineProperty(output, key, {
      value: decoded,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }

  return output;
}

/** Strip credentials and query/fragment from a URL attribute. */
function safeUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const redacted = redactValue(value, 2048);

  const hashIndex = redacted.indexOf('#');

  const withoutHash = hashIndex >= 0 ? redacted.slice(0, hashIndex) : redacted;

  const queryIndex = withoutHash.indexOf('?');

  return queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
}

interface SpanRecord {
  span: unknown;
  resource: Record<string, string>;
}

/** Walk OTLP resourceSpans / scopeSpans, or a flat span array. */
function collectSpans(input: unknown): { spans: SpanRecord[]; truncated: boolean } {
  const spans: SpanRecord[] = [];

  const push = (span: unknown, resource: Record<string, string>): void => {
    spans.push({ span, resource });
  };

  const resourceSpans = ownValue(input, 'resourceSpans');

  if (Array.isArray(resourceSpans)) {
    for (const rs of resourceSpans) {
      const resource = flattenAttributes(ownValue(readObject(rs, 'resource'), 'attributes'));

      const scopeSpans = readArray(rs, 'scopeSpans');

      const legacySpans = readArray(rs, 'instrumentationLibrarySpans');

      for (const group of [...scopeSpans, ...legacySpans]) {
        for (const span of readArray(group, 'spans')) {
          push(span, resource);
        }
      }
    }

    return { spans, truncated: false };
  }

  const flat = readArray(input, 'spans');

  if (flat.length > 0) {
    for (const span of flat) {
      push(span, {});
    }

    return { spans, truncated: false };
  }

  if (Array.isArray(input)) {
    for (const span of input) {
      push(span, {});
    }
  }

  return { spans, truncated: false };
}

function symbolRefFrom(attributes: Record<string, string>): RuntimeSymbolRef | undefined {
  const name = attributes['code.function'];

  const namespace = attributes['code.namespace'];

  const filepath = attributes['code.filepath'];

  if (!name) {
    return undefined;
  }

  const ref: RuntimeSymbolRef = { name };

  if (namespace) {
    ref.module = namespace;
    ref.qualifiedName = namespace.endsWith(name) ? namespace : `${namespace}.${name}`;
  }

  if (filepath) {
    ref.filePath = filepath;
  }

  return ref;
}

function spanKind(span: unknown): number {
  return readNumber(span, 'kind') ?? 0;
}

function spanTimestamp(span: unknown): string | undefined {
  const nanos = readString(span, 'startTimeUnixNano');

  if (!nanos) {
    return undefined;
  }

  const value = Number(nanos);

  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return new Date(Math.floor(value / 1_000_000)).toISOString();
}

function spanDurationMs(span: unknown): number | undefined {
  const start = readString(span, 'startTimeUnixNano');

  const end = readString(span, 'endTimeUnixNano');

  if (!start || !end) {
    return undefined;
  }

  const delta = Number(end) - Number(start);

  return Number.isFinite(delta) && delta >= 0 ? Math.floor(delta / 1_000_000) : undefined;
}

export const otelJsonAdapter: RawTraceAdapter = {
  id: 'otel-json',
  source: 'opentelemetry',

  detect(input: unknown): boolean {
    if (input === null || typeof input !== 'object') {
      return false;
    }

    if (Array.isArray(input)) {
      return input.length > 0 && input.every((entry) => typeof entry === 'object');
    }

    if (Array.isArray(ownValue(input, 'resourceSpans'))) {
      return true;
    }

    return Array.isArray(ownValue(input, 'spans'));
  },

  convert(input: unknown, context: AdapterContext): AdapterResult {
    const { spans } = collectSpans(input);

    if (spans.length > context.limits.maxEventsPerImport) {
      return {
        events: [],
        rejected: spans.length,
        diagnostics: ['TRACE_LIMIT_EXCEEDED'],
      };
    }

    const events: RuntimeTraceEvent[] = [];

    const diagnostics: RuntimeTraceDiagnosticCode[] = ['TRACE_ATTRIBUTE_DROPPED'];

    let rejected = 0;

    /* Span name lookup enables parent-child call derivation. */
    const bySpanId = new Map<string, Record<string, string>>();

    const spanAttributes = spans.map(({ span, resource }) => {
      const merged: Record<string, string> = {
        ...resource,
        ...flattenAttributes(ownValue(span, 'attributes')),
      };

      const spanId = readString(span, 'spanId');

      if (spanId) {
        bySpanId.set(spanId, merged);
      }

      return merged;
    });

    spans.forEach(({ span }, index) => {
      const merged = spanAttributes[index] ?? {};

      const sanitized = sanitizeAttributes(merged, context.limits, OTEL_ATTRIBUTE_ALLOWLIST);

      const attributes = sanitized.attributes;

      if (sanitized.redacted) {
        diagnostics.push('TRACE_SECRET_REDACTED');
      }

      const traceId = readString(span, 'traceId');

      const spanId = readString(span, 'spanId');

      const parentSpanId = readString(span, 'parentSpanId');

      const timestamp = spanTimestamp(span);

      const durationMs = spanDurationMs(span);

      const serviceName = attributes['service.name'];

      const base = {
        sessionId: context.sessionId,
        projectId: context.projectId,
        ...(traceId ? { traceId } : {}),
        ...(spanId ? { spanId } : {}),
        ...(parentSpanId ? { parentSpanId } : {}),
        ...(timestamp ? { timestamp } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
        ...(serviceName ? { serviceId: serviceName } : {}),
        attributes,
        diagnostics: [] as RuntimeTraceDiagnosticCode[],
      };

      const kind = spanKind(span);

      const httpMethod = attributes['http.request.method'] ?? attributes['http.method'];

      const rawPath =
        attributes['http.route'] ??
        attributes['http.target'] ??
        attributes['url.path'] ??
        safeUrl(attributes['url.full']);

      const messagingSystem = attributes['messaging.system'];

      const channel =
        attributes['messaging.destination.name'] ??
        attributes['messaging.destination'] ??
        attributes['messaging.operation'];

      const messagingOperation = attributes['messaging.operation'];

      /* 1. Messaging spans: publish -> emit, receive/process -> consume. */
      if (messagingSystem && channel) {
        const isConsume =
          kind === 5 ||
          kind === 4 ||
          /receive|process|consume|subscribe/iu.test(messagingOperation ?? '');

        const isPublish =
          kind === 4 && !isConsume ? true : /publish|send|produce/iu.test(messagingOperation ?? '');

        const ref = symbolRefFrom(attributes);

        const correlationRaw = attributes['messaging.message.id'];

        const correlationId = correlationRaw ? hashCorrelation(correlationRaw) : undefined;

        const common = {
          ...base,
          eventId: eventIdFor({
            sessionId: context.sessionId,
            kind: isPublish && !isConsume ? 'event_emit' : 'event_consume',
            traceId,
            spanId,
            timestamp,
            provider: messagingSystem,
            channel,
          }),
          provider: messagingSystem,
          channel,
          ...(correlationId ? { correlationId } : {}),
        };

        if (isPublish && !isConsume) {
          events.push({ ...common, kind: 'event_emit', producer: ref ?? {} });
        } else {
          events.push({ ...common, kind: 'event_consume', consumer: ref ?? {} });
        }

        return;
      }

      /* 2. HTTP spans. */
      if (httpMethod && rawPath) {
        const path = canonicalizeHttpPath(rawPath);

        if (!path) {
          rejected += 1;
          return;
        }

        const statusCode = readNumber(
          { status: attributes['http.response.status_code'] ?? attributes['http.status_code'] },
          'status'
        );

        const host =
          attributes['server.address'] ?? attributes['net.peer.name'] ?? attributes['http.host'];

        events.push({
          ...base,
          eventId: eventIdFor({
            sessionId: context.sessionId,
            kind: 'http',
            traceId,
            spanId,
            timestamp,
            method: httpMethod.toUpperCase(),
            path,
          }),
          kind: 'http',
          method: httpMethod.toUpperCase(),
          path,
          ...(host ? { host } : {}),
          ...(statusCode !== undefined ? { statusCode } : {}),
        });

        return;
      }

      /* 3. Call spans: this span's code.function called by its parent's. */
      const callee = symbolRefFrom(attributes);

      const rpcService = attributes['rpc.service'];

      const rpcMethod = attributes['rpc.method'];

      if (!callee && !rpcService) {
        rejected += 1;
        return;
      }

      const target: RuntimeSymbolRef =
        callee ??
        ({
          name: rpcMethod ?? 'unknown',
          ...(rpcService
            ? { qualifiedName: `${rpcService}${rpcMethod ? `.${rpcMethod}` : ''}` }
            : {}),
        } as RuntimeSymbolRef);

      const parentAttributes = parentSpanId ? bySpanId.get(parentSpanId) : undefined;

      const parentRef = parentAttributes
        ? symbolRefFrom(
            sanitizeAttributes(parentAttributes, context.limits, OTEL_ATTRIBUTE_ALLOWLIST)
              .attributes
          )
        : undefined;

      const caller: RuntimeSymbolRef =
        parentRef ?? (serviceName ? { module: serviceName, name: serviceName } : {});

      events.push({
        ...base,
        eventId: eventIdFor({
          sessionId: context.sessionId,
          kind: 'call',
          traceId,
          spanId,
          timestamp,
          source: caller.symbolId ?? caller.qualifiedName ?? caller.name,
          target: target.symbolId ?? target.qualifiedName ?? target.name,
        }),
        kind: 'call',
        caller,
        callee: target,
        dispatch: kind === 3,
      });
    });

    /* Session timestamps come from resource/span metadata, never guessed. */
    const starts = spans
      .map(({ span }) => spanTimestamp(span))
      .filter((value): value is string => typeof value === 'string')
      .sort();

    return {
      events,
      rejected,
      diagnostics,
      startedAt: starts[0],
      endedAt: starts.at(-1),
    };
  },
};
