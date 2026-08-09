import { Sanitizer } from '../security/sanitizer.js';

import type {
  LocalSessionState,
  SessionCoreOptions,
  SessionEventInput,
  SessionFlushResult,
} from './types.js';

import { createSessionIdentity } from './identity.js';

import { RemoteSessionStore } from './store.js';

import { SessionWal } from './wal.js';

import { SessionMemoryLearner } from './learner/learner.js';

import { WorkContinuityLearner } from '../work-continuity/learner.js';

import { SemanticWorkLearner } from '../work-continuity/semantic-learner.js';

import { SmartHandoffManager } from '../work-continuity/handoff.js';

export class SessionCore {
  readonly identity;

  readonly wal: SessionWal;

  readonly remote: RemoteSessionStore;

  private readonly sanitizer = new Sanitizer();

  private readonly learner: SessionMemoryLearner;

  private readonly continuity: WorkContinuityLearner;

  private readonly semantic: SemanticWorkLearner;

  private readonly handoff: SmartHandoffManager;

  private readonly title?: string;

  private readonly metadata: Record<string, unknown>;

  constructor(options: SessionCoreOptions) {
    this.identity = createSessionIdentity(options.project, options.agent, options.nativeSessionId);

    this.title = options.title;

    this.metadata = this.sanitizer.sanitizeValue(options.metadata ?? {}) as Record<string, unknown>;

    this.wal = new SessionWal(this.identity);

    this.remote = new RemoteSessionStore(
      options.storage,
      options.maxEventsPerChunk ?? 100,
      options.maxChunkBytes ?? 512 * 1024
    );

    this.learner = new SessionMemoryLearner({
      project: options.project,

      storage: options.storage,

      identity: this.identity,

      wal: this.wal,
    });

    this.continuity = new WorkContinuityLearner({
      project: options.project,

      storage: options.storage,

      identity: this.identity,

      wal: this.wal,
    });

    this.semantic = new SemanticWorkLearner({
      project: options.project,

      storage: options.storage,

      identity: this.identity,

      wal: this.wal,
    });

    this.handoff = new SmartHandoffManager({
      project: options.project,

      storage: options.storage,

      identity: this.identity,
    });
  }

  private sanitizeEvent(event: SessionEventInput): SessionEventInput {
    const provenance = event.provenance
      ? {
          ...event.provenance,

          metadata: this.sanitizer.sanitizeValue(event.provenance.metadata) as
            Record<string, unknown> | undefined,
        }
      : undefined;

    return {
      ...event,

      data: this.sanitizer.sanitizeValue(event.data ?? {}) as Record<string, unknown>,

      provenance,
    };
  }

  start(data: Record<string, unknown> = {}) {
    const state = this.wal.loadState();

    return this.record({
      type: state.lastSequence === 0 ? 'session_start' : 'session_resume',

      data,

      provenance: {
        source: this.identity.agent,
      },
    });
  }

  record(event: SessionEventInput) {
    return this.wal.append([this.sanitizeEvent(event)])[0];
  }

  recordMany(events: SessionEventInput[]) {
    return this.wal.append(events.map((event) => this.sanitizeEvent(event)));
  }

  setSourceCursor(source: string, value: string | number): void {
    this.wal.setSourceCursor(source, value);
  }

  async flush(): Promise<SessionFlushResult> {
    const pending = this.wal.readPending();

    const state = this.wal.loadState();

    const result = await this.remote.append(this.identity, pending.events, state.sourceCursors, {
      title: this.title,

      metadata: this.metadata,
    });

    if (pending.events.length > 0) {
      const last = pending.events[pending.events.length - 1];

      this.wal.markRemote(last.sequence, pending.endOffset);
    }

    /*
     * Long-term learning is deliberately downstream
     * of durable session persistence.
     *
     * A learner failure must NEVER destroy session capture.
     * Cursor is not advanced on learner failure,
     * so next flush retries.
     */
    if (process.env.TOOLNET_SESSION_LEARNING !== '0') {
      try {
        await this.learner.learnNew();
      } catch {
        // Retry automatically on a later flush.
      }
    }

    /*
     * Work continuity is a separate projection from
     * long-term memory.
     *
     * Failure here must never break session capture.
     */
    if (process.env.TOOLNET_WORK_CONTINUITY !== '0') {
      try {
        await this.continuity.learnNew();
      } catch {
        // Immutable session WAL allows retry later.
      }
    }

    /*
     * Semantic continuity learns meaning, rationale,
     * deliverables and completion criteria.
     *
     * It never invents missing rationale.
     */
    if (process.env.TOOLNET_SEMANTIC_CONTINUITY !== '0') {
      try {
        await this.semantic.learnNew();
      } catch {
        // Derived projection: session capture must continue.
      }
    }

    /*
     * Smart Handoff checkpoint.
     *
     * We checkpoint on every durable flush, not only graceful
     * session_end. This protects continuity when an agent hits
     * token limit, terminal disconnect, crash, or user stops
     * unexpectedly.
     *
     * Handoff IDs are state-digest based, so unchanged work
     * does not create endless duplicate snapshots.
     */
    if (process.env.TOOLNET_SMART_HANDOFF !== '0' && pending.events.length > 0) {
      try {
        const lastEvent = pending.events[pending.events.length - 1];

        const explicitReason = ['session_idle', 'session_end', 'session_compact'].includes(
          lastEvent.type
        )
          ? lastEvent.type
          : 'checkpoint';

        await this.handoff.capture(explicitReason, lastEvent.sequence);
      } catch {
        /*
         * Handoff is a derived projection.
         * It must never break durable session capture.
         */
      }
    }

    return result;
  }

  async idle(data: Record<string, unknown> = {}): Promise<SessionFlushResult> {
    this.record({
      type: 'session_idle',

      data,

      provenance: {
        source: this.identity.agent,
      },
    });

    return this.flush();
  }

  async end(data: Record<string, unknown> = {}): Promise<SessionFlushResult> {
    this.record({
      type: 'session_end',

      data,

      provenance: {
        source: this.identity.agent,
      },
    });

    return this.flush();
  }

  status(): LocalSessionState {
    return this.wal.loadState();
  }

  recoverRemote() {
    return this.remote.recover(this.identity);
  }
}
