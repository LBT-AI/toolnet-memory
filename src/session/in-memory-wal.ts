/**
 * In-memory Session WAL for strict cloud-only mode.
 *
 * Stores events in bounded RAM only. No filesystem access.
 * Used when TOOLNET_DURABILITY_MODE=strict-cloud-only.
 */

import type {
  LocalSessionState,
  NormalizedSessionEvent,
  PendingSessionEvents,
  SessionEventContext,
  SessionEventInput,
  SessionIdentity,
} from './types.js';

import { canonicalizeSessionEventInput } from './unified-event.js';
import { sanitizeDurableValue } from '../security/durable-sanitizer.js';
import { sha256, stableStringify } from './utils.js';

const RECENT_EVENT_LIMIT = 2_000;
const MAX_EVENTS = 10_000;

function statusFromEvent(event: NormalizedSessionEvent): LocalSessionState['status'] {
  switch (event.type) {
    case 'session_start':
    case 'session_resume':
      return 'active';
    case 'session_idle':
    case 'session_end':
    case 'session_compact':
      return 'idle';
    case 'error':
      return 'error';
    default:
      return 'active';
  }
}

export class InMemorySessionWal {
  private events: NormalizedSessionEvent[] = [];
  private state: LocalSessionState;
  private readonly identity: SessionIdentity;
  private readonly eventContext: SessionEventContext;
  readonly eventsFile: string;

  constructor(identity: SessionIdentity, eventContext: SessionEventContext = {}) {
    this.identity = identity;
    this.eventContext = eventContext;
    this.state = this.initialState();
    this.eventsFile = ':memory:';
  }

  private initialState(): LocalSessionState {
    const now = new Date().toISOString();

    return {
      version: 1,

      projectId: this.identity.projectId,

      agent: this.identity.agent,

      nativeSessionId: this.identity.nativeSessionId,

      status: 'idle',

      createdAt: now,

      updatedAt: now,

      lastSequence: 0,

      lastRemoteSequence: 0,

      remoteByteOffset: 0,

      sourceCursors: {},

      recentEventIds: [],
    };
  }

  append(inputs: SessionEventInput[]): NormalizedSessionEvent[] {
    if (inputs.length === 0) {
      return [];
    }

    const state = this.state;
    const recent = new Set(state.recentEventIds);

    let nextSequence = state.lastSequence;

    const normalized: NormalizedSessionEvent[] = [];

    for (const rawInput of inputs) {
      const input = canonicalizeSessionEventInput(rawInput, this.eventContext);

      const timestamp = input.timestamp ?? new Date().toISOString();

      const rawData = input.data ?? {};
      const rawDigest = input.provenance?.rawDigest ?? sha256(stableStringify(rawData));
      const data = sanitizeDurableValue(rawData) as Record<string, unknown>;

      const idSeed = input.sourceEventId
        ? [
            this.identity.projectId,
            this.identity.agent,
            this.identity.nativeSessionId,
            input.sourceEventId,
          ].join('|')
        : [
            this.identity.projectId,
            this.identity.agent,
            this.identity.nativeSessionId,
            nextSequence + 1,
            input.type,
            timestamp,
            rawDigest,
          ].join('|');

      const eventId = sha256(idSeed).slice(0, 32);

      if (recent.has(eventId)) {
        continue;
      }

      nextSequence += 1;

      const event: NormalizedSessionEvent = {
        version: 1,

        id: eventId,

        sequence: nextSequence,

        projectId: this.identity.projectId,

        agent: this.identity.agent,

        nativeSessionId: this.identity.nativeSessionId,

        sessionId: this.identity.nativeSessionId,

        type: input.type,

        timestamp,

        source: input.source ?? input.provenance?.source ?? this.identity.agent,

        data,

        provenance: {
          ...input.provenance,

          rawDigest,
        },
      };

      if (input.role !== undefined) {
        event.role = input.role;
      }

      if (input.turnId !== undefined) {
        event.turnId = input.turnId;
      }

      if (input.cwd !== undefined) {
        event.cwd = input.cwd;
      }

      if (input.sourceEventId !== undefined) {
        event.sourceEventId = input.sourceEventId;
      }

      if (input.sourceSequence !== undefined) {
        event.sourceSequence = input.sourceSequence;
      }

      normalized.push(event);

      recent.add(eventId);
    }

    if (normalized.length === 0) {
      return [];
    }

    // Bounded RAM: drop oldest events if over capacity
    this.events.push(...normalized);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }

    const last = normalized[normalized.length - 1];
    const status = statusFromEvent(last);

    const recentEventIds = Array.from(recent).slice(-RECENT_EVENT_LIMIT);

    this.state = {
      ...state,

      status,

      updatedAt: last.timestamp,

      lastLocalEventAt: last.timestamp,

      lastSequence: last.sequence,

      recentEventIds,
    };

    return normalized;
  }

  readAllEvents(): NormalizedSessionEvent[] {
    return [...this.events];
  }

  readPending(): PendingSessionEvents {
    const state = this.state;

    if (this.events.length === 0) {
      return {
        events: [],
        startOffset: state.remoteByteOffset,
        endOffset: state.remoteByteOffset,
      };
    }

    // In memory, we track by sequence number
    const pendingEvents = this.events.filter((e) => e.sequence > state.lastRemoteSequence);

    return {
      events: pendingEvents,
      startOffset: state.remoteByteOffset,
      endOffset: state.remoteByteOffset + pendingEvents.length,
    };
  }

  markRemote(sequence: number, byteOffset: number): void {
    const now = new Date().toISOString();

    this.state = {
      ...this.state,

      lastRemoteSequence: Math.max(this.state.lastRemoteSequence, sequence),

      remoteByteOffset: Math.max(this.state.remoteByteOffset, byteOffset),

      lastRemoteAt: now,

      updatedAt: now,
    };
  }

  setSourceCursor(source: string, value: string | number): void {
    this.state = {
      ...this.state,

      sourceCursors: {
        ...this.state.sourceCursors,

        [source]: String(value),
      },

      updatedAt: new Date().toISOString(),
    };
  }

  readEventsFromOffset(offset: number): { events: NormalizedSessionEvent[]; nextOffset: number } {
    const start = Number.isFinite(offset) ? Math.max(0, offset) : 0;

    if (start >= this.events.length) {
      return { events: [], nextOffset: this.events.length };
    }

    const events = this.events.slice(start);
    return { events, nextOffset: this.events.length };
  }

  loadState(): LocalSessionState {
    return { ...this.state };
  }
}
