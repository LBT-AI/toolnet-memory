/*
 * Phase 77 — daemon IPC protocol.
 *
 * Framing is length-prefixed JSON: a 4-byte big-endian length header followed
 * by exactly that many UTF-8 bytes. This is unambiguous, bounds every message
 * before allocation, and needs no escaping rules.
 *
 * Requests are always validated before dispatch. Arbitrary JSON objects are
 * never treated as commands.
 */

import {
  DaemonError,
  type DaemonRequest,
  type DaemonRequestEnvelope,
  type DaemonServerMessage,
} from './types.js';

export const FRAME_HEADER_BYTES = 4;

export function encodeFrame(value: unknown, maxMessageBytes: number): Buffer {
  const payload = Buffer.from(JSON.stringify(value), 'utf8');

  if (payload.byteLength > maxMessageBytes) {
    throw new DaemonError('MESSAGE_TOO_LARGE', 'Outbound daemon message exceeds the size limit.');
  }

  const frame = Buffer.allocUnsafe(FRAME_HEADER_BYTES + payload.byteLength);

  frame.writeUInt32BE(payload.byteLength, 0);

  payload.copy(frame, FRAME_HEADER_BYTES);

  return frame;
}

/**
 * Incremental frame decoder.
 *
 * Rejects an oversized declared length BEFORE allocating the payload, so a
 * malicious local client cannot force a giant allocation.
 */
export class FrameDecoder {
  private buffer: Buffer = Buffer.alloc(0);

  constructor(private readonly maxMessageBytes: number) {}

  push(chunk: Buffer): unknown[] {
    this.buffer = this.buffer.byteLength === 0 ? chunk : Buffer.concat([this.buffer, chunk]);

    const messages: unknown[] = [];

    for (;;) {
      if (this.buffer.byteLength < FRAME_HEADER_BYTES) {
        break;
      }

      const length = this.buffer.readUInt32BE(0);

      if (length > this.maxMessageBytes) {
        throw new DaemonError(
          'MESSAGE_TOO_LARGE',
          'Inbound daemon message exceeds the size limit.'
        );
      }

      if (this.buffer.byteLength < FRAME_HEADER_BYTES + length) {
        break;
      }

      const payload = this.buffer.subarray(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + length);

      this.buffer = this.buffer.subarray(FRAME_HEADER_BYTES + length);

      let parsed: unknown;

      try {
        parsed = JSON.parse(payload.toString('utf8'));
      } catch {
        throw new DaemonError('PROTOCOL_MALFORMED', 'Daemon message is not valid JSON.');
      }

      messages.push(parsed);
    }

    return messages;
  }

  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}

const REQUEST_TYPES = new Set<string>([
  'hello',
  'heartbeat',
  'attach_project',
  'detach_project',
  'project_status',
  'ensure_ready',
  'index_project',
  'artifact_status',
  'hydrate_artifact',
  'query',
  'evidence',
  'change',
  'contract',
  'test_selection',
  'run_tests',
  'test_status',
  'subscribe_progress',
  'unsubscribe_progress',
  'cancel_job',
  'daemon_status',
  'shutdown',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProjectRef(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    typeof value.rootPath === 'string'
  );
}

/**
 * Validate a request envelope.
 *
 * Returns `null` when the message is not a well-formed request. Per-request
 * field validation is intentionally strict: unknown shapes are rejected rather
 * than coerced.
 */
export function parseRequestEnvelope(value: unknown): DaemonRequestEnvelope | null {
  if (!isObject(value)) {
    return null;
  }

  const requestId = value.requestId;
  const request = value.request;

  if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 128) {
    return null;
  }

  if (!isObject(request) || typeof request.type !== 'string') {
    return null;
  }

  if (!REQUEST_TYPES.has(request.type)) {
    return null;
  }

  if (!validateRequestFields(request)) {
    return null;
  }

  return {
    requestId,
    request: request as unknown as DaemonRequest,
  };
}

function validateRequestFields(request: Record<string, unknown>): boolean {
  switch (request.type) {
    case 'hello':
      /*
       * Protocol version is validated by the handler so a version mismatch can
       * be answered with DAEMON_PROTOCOL_MISMATCH rather than a generic
       * malformed-message rejection.
       */
      return (
        typeof request.protocolVersion === 'number' &&
        typeof request.fingerprint === 'string' &&
        isObject(request.client) &&
        typeof (request.client as Record<string, unknown>).type === 'string'
      );

    case 'heartbeat':
      return typeof request.sessionId === 'string';

    case 'attach_project':
    case 'ensure_ready':
    case 'index_project':
    case 'artifact_status':
    case 'hydrate_artifact':
      return typeof request.sessionId === 'string' && isProjectRef(request.project);

    case 'detach_project':
      return typeof request.sessionId === 'string' && typeof request.projectId === 'string';

    case 'project_status':
      return typeof request.sessionId === 'string' && isProjectRef(request.project);

    case 'query':
      return (
        typeof request.sessionId === 'string' &&
        isProjectRef(request.project) &&
        typeof request.query === 'string' &&
        request.query.length <= 65536
      );

    case 'evidence': {
      const evidence = request.evidence;

      if (!isObject(evidence)) {
        return false;
      }

      return (
        typeof request.sessionId === 'string' &&
        isProjectRef(request.project) &&
        typeof evidence.profile === 'string' &&
        typeof evidence.operation === 'string' &&
        typeof evidence.claim === 'string' &&
        isObject(evidence.scope)
      );
    }

    case 'change': {
      const change = request.change;

      if (!isObject(change) || !isObject(change.request)) {
        return false;
      }

      const inner = change.request;

      return (
        typeof request.sessionId === 'string' &&
        isProjectRef(request.project) &&
        typeof inner.projectId === 'string' &&
        typeof inner.mode === 'string'
      );
    }

    case 'contract': {
      const contract = request.contract;

      if (!isObject(contract) || !isObject(contract.request) || !isObject(contract.change)) {
        return false;
      }

      const inner = contract.request;

      return (
        typeof request.sessionId === 'string' &&
        isProjectRef(request.project) &&
        typeof inner.projectId === 'string'
      );
    }

    case 'test_selection': {
      const selection = request.selection;

      if (!isObject(selection) || !isObject(selection.request) || !isObject(selection.change)) {
        return false;
      }

      return (
        typeof request.sessionId === 'string' &&
        isProjectRef(request.project) &&
        typeof selection.request.projectId === 'string'
      );
    }

    case 'run_tests': {
      const run = request.run;

      if (!isObject(run) || !isObject(run.request)) {
        return false;
      }

      return (
        typeof request.sessionId === 'string' &&
        isProjectRef(request.project) &&
        typeof run.request.selectionId === 'string'
      );
    }

    case 'test_status':
      return (
        typeof request.sessionId === 'string' &&
        isProjectRef(request.project) &&
        (request.limit === undefined || typeof request.limit === 'number')
      );

    case 'subscribe_progress':
    case 'unsubscribe_progress':
    case 'cancel_job':
      return typeof request.sessionId === 'string' && typeof request.jobId === 'string';

    case 'daemon_status':
      return true;

    case 'shutdown':
      return request.force === undefined || typeof request.force === 'boolean';

    default:
      return false;
  }
}

export function parseServerMessage(value: unknown): DaemonServerMessage | null {
  if (!isObject(value)) {
    return null;
  }

  if (value.kind === 'progress' && isObject(value.event)) {
    return value as unknown as DaemonServerMessage;
  }

  if (typeof value.requestId === 'string' && isObject(value.response)) {
    return value as unknown as DaemonServerMessage;
  }

  return null;
}
