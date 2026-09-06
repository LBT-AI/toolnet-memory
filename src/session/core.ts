import { Sanitizer } from '../security/sanitizer.js';

import type {
  LocalSessionState,
  NormalizedSessionEvent,
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

import { checkpointLocalSession } from './local-checkpoint.js';

import { NativeTaskMirrorRuntime } from './native-plan/runtime.js';
import { recoverSessionTaskState, type SessionTaskSelfHealingResult } from './task-self-healing.js';
import { TaskReplicationRuntime } from '../tasks/replication/runtime.js';
import {
  resolveTaskSessionExecutionWithAutoRecovery,
  renderTaskSessionBootstrap,
} from '../tasks/session-resume.js';
import {
  TaskHeartbeatRuntime,
  TaskOrchestrationEngine,
  type SessionExecutionResolution,
} from '../tasks/orchestration-engine.js';
import { TaskStore } from '../tasks/store.js';

export class SessionCore {
  readonly identity;

  readonly wal: SessionWal;

  readonly remote: RemoteSessionStore;

  private readonly sanitizer = new Sanitizer();

  private readonly learner: SessionMemoryLearner;

  private readonly continuity: WorkContinuityLearner;

  private readonly semantic: SemanticWorkLearner;

  private readonly handoff: SmartHandoffManager;

  private readonly taskMirror: NativeTaskMirrorRuntime;

  private readonly taskReplication: TaskReplicationRuntime;

  private readonly taskAgentId: string;

  private readonly taskHeartbeat?: import('../tasks/orchestration-engine.js').TaskHeartbeatRuntime;

  private taskExecutionResolutionValue?: SessionExecutionResolution;

  private taskSelfHealingResultValue?: SessionTaskSelfHealingResult;

  private readonly project: SessionCoreOptions['project'];

  private readonly title?: string;

  private readonly metadata: Record<string, unknown>;

  constructor(options: SessionCoreOptions) {
    this.project = options.project;

    this.identity = createSessionIdentity(options.project, options.agent, options.nativeSessionId);

    this.title = options.title;

    this.metadata = this.sanitizer.sanitizeValue(options.metadata ?? {}) as Record<string, unknown>;

    this.wal = new SessionWal(this.identity, options.eventContext);

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

    this.taskMirror = new NativeTaskMirrorRuntime(options.project);

    this.taskReplication = new TaskReplicationRuntime(options.project, options.storage);

    this.taskAgentId = options.agent.trim();

    if (this.taskAgentId) {
      const taskStore = new TaskStore(options.project);
      this.taskHeartbeat = new TaskHeartbeatRuntime(
        new TaskOrchestrationEngine(taskStore, () => taskStore.replicationConflicts())
      );
    }
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

  private checkpointLocal(events: NormalizedSessionEvent[]): void {
    if (events.length === 0) {
      return;
    }

    try {
      checkpointLocalSession(this.project, this.identity, events);
    } catch {
      /*
       * Local work-state is a projection.
       *
       * WAL durability always has priority.
       * Never break session capture because
       * current.json rendering failed.
       */
    }

    /*
     * This method is called after SessionWal.append() succeeds. Task Mirror
     * is another derived consumer and is intentionally non-blocking here.
     */
    this.taskMirror.enqueue(events);
  }

  async start(data: Record<string, unknown> = {}) {
    const state = this.wal.loadState();

    /*
     * Preserve the historical synchronous WAL append boundary: callers may
     * invoke start() without awaiting it. Recovery begins after this durable
     * start/resume event, so later recordMany() calls cannot overtake it.
     * A previous process may have fsynced a native plan event to the WAL and
     * crashed before TaskMirror.enqueue() ran; the replay below repairs that.
     */
    const recorded = this.record({
      type: state.lastSequence === 0 ? 'session_start' : 'session_resume',
      data,
      provenance: {
        source: this.identity.agent,
      },
    });

    try {
      this.taskSelfHealingResultValue = await recoverSessionTaskState(
        this.project,
        this.wal,
        this.taskMirror
      );
      await this.taskMirror.drain();
      this.taskExecutionResolutionValue = await this.resolveTaskSessionExecution();
      const resolution = this.taskExecutionResolutionValue;
      const task = resolution.task;
      if (
        task &&
        (resolution.mode === 'owned' || resolution.mode === 'handoff') &&
        task.activeLease
      ) {
        this.taskHeartbeat?.start(task.id, this.taskAgentId);
      }
    } catch {
      this.taskSelfHealingResultValue = undefined;
      // Task resume is derived context and must not block session capture.
    }

    return recorded;
  }

  record(event: SessionEventInput) {
    const recorded = this.wal.append([this.sanitizeEvent(event)]);

    this.checkpointLocal(recorded);

    return recorded[0];
  }

  recordMany(events: SessionEventInput[]) {
    const recorded = this.wal.append(events.map((event) => this.sanitizeEvent(event)));

    this.checkpointLocal(recorded);

    return recorded;
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
     * Drain mirror work accepted by this SessionCore. The runtime absorbs
     * mirror failures, so this cannot make flush fail because of Tasks.
     */
    await this.taskMirror.drain();

    /*
     * Publish only after native Task mutation has drained. Remote
     * replication is downstream and never participates in local capture.
     */
    this.taskReplication.enqueue();
    await this.taskReplication.drain();

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

    this.taskHeartbeat?.stop();
    this.taskExecutionResolutionValue = undefined;

    return this.flush();
  }
  async resolveTaskSessionExecution(
    options: { autoRecover?: boolean; now?: number } = {}
  ): Promise<SessionExecutionResolution> {
    return resolveTaskSessionExecutionWithAutoRecovery(this.project, {
      agentId: this.taskAgentId,
      nativeSessionId: this.identity.nativeSessionId,
      ...(options.autoRecover !== undefined ? { autoRecover: options.autoRecover } : {}),
      ...(options.now !== undefined ? { now: options.now } : {}),
      maxChars: 4_000,
    });
  }

  taskResumeBootstrap(options: { maxChars?: number } = {}): string | undefined {
    return renderTaskSessionBootstrap(this.project, {
      agentId: this.taskAgentId,
      nativeSessionId: this.identity.nativeSessionId,
      maxChars: options.maxChars,
    });
  }

  taskExecutionResolution(): SessionExecutionResolution | undefined {
    return this.taskExecutionResolutionValue;
  }

  taskHeartbeatStatus() {
    return (
      this.taskHeartbeat?.status() ?? {
        running: false,
        beats: 0,
        failures: 0,
      }
    );
  }

  status(): LocalSessionState {
    return this.wal.loadState();
  }

  taskMirrorStatus() {
    return this.taskMirror.status();
  }

  taskSelfHealingStatus(): SessionTaskSelfHealingResult | undefined {
    return this.taskSelfHealingResultValue;
  }

  taskReplicationStatus() {
    return this.taskReplication.status();
  }

  recoverRemote() {
    return this.remote.recover(this.identity);
  }
}
