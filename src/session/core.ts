import { Sanitizer } from '../security/sanitizer.js';

import type {
  LocalSessionState,
  NormalizedSessionEvent,
  PendingSessionEvents,
  SessionCoreOptions,
  SessionEventInput,
  SessionEventType,
  SessionFlushResult,
} from './types.js';

import { createSessionIdentity } from './identity.js';

import { RemoteSessionStore } from './store.js';

import { SessionWal } from './wal.js';
import { InMemorySessionWal } from './in-memory-wal.js';

export interface SessionWalInterface {
  append(inputs: SessionEventInput[]): NormalizedSessionEvent[];
  readAllEvents(): NormalizedSessionEvent[];
  readEventsFromOffset(offset: number): { events: NormalizedSessionEvent[]; nextOffset: number };
  readPending(): PendingSessionEvents;
  markRemote(sequence: number, byteOffset: number): void;
  setSourceCursor(source: string, value: string | number): void;
  loadState(): LocalSessionState;
  eventsFile: string;
}

import { SessionMemoryLearner } from './learner/learner.js';

import { SessionMemoryMaterializer } from './learner/materializer.js';

import { WorkContinuityLearner } from '../work-continuity/learner.js';

import { SemanticWorkLearner } from '../work-continuity/semantic-learner.js';

import { SmartHandoffManager } from '../work-continuity/handoff.js';

import { checkpointLocalSession } from './local-checkpoint.js';

import { NativeTaskMirrorRuntime } from './native-plan/runtime.js';
import { recoverSessionTaskState, type SessionTaskSelfHealingResult } from './task-self-healing.js';
import { TaskReplicationRuntime } from '../tasks/replication/runtime.js';
import { resolveTaskSessionExecutionWithAutoRecovery } from '../tasks/session-resume.js';
import {
  TaskHeartbeatRuntime,
  TaskOrchestrationEngine,
  type SessionExecutionResolution,
} from '../tasks/orchestration-engine.js';
import { TaskStore } from '../tasks/store.js';
import { refreshCurrentWorkProjection } from '../work-continuity/current-work-projection.js';

// v0.7 automatic checkpoint integration
import {
  AgentCheckpointEvent,
  CloudCheckpointSession,
  CloudCheckpointSessionOptions,
} from '../v0.7/checkpoint-runtime.js';
import {
  createCloudAuthorityFromEnv,
  hasCloudAuthorityConfig,
} from '../v0.7/cloud-authority-factory.js';
import { resolveDurabilityMode } from '../v0.7/durability-policy.js';
import { resumeFromCloud, type CloudResumeResult } from '../v0.7/resume.js';
import type { CloudAuthority } from '../v0.7/cloud-authority.js';

export class SessionCore {
  readonly identity;

  readonly wal: SessionWalInterface;

  readonly remote: RemoteSessionStore;

  private readonly sanitizer = new Sanitizer();

  private readonly learner: SessionMemoryLearner;

  private readonly materializer: SessionMemoryMaterializer;

  private readonly continuity: WorkContinuityLearner;

  private readonly semantic: SemanticWorkLearner;

  private readonly handoff: SmartHandoffManager;

  private readonly taskMirror: NativeTaskMirrorRuntime;

  private readonly taskReplication: TaskReplicationRuntime;

  private readonly taskAgentId: string;

  private readonly taskHeartbeat?: TaskHeartbeatRuntime;

  private taskExecutionResolutionValue?: SessionExecutionResolution;

  private taskSelfHealingResultValue?: SessionTaskSelfHealingResult;

  private readonly project: SessionCoreOptions['project'];

  private readonly title?: string;

  private readonly metadata: Record<string, unknown>;

  // v0.7 automatic checkpoint integration
  private readonly checkpointSession?: CloudCheckpointSession;
  private readonly cloudAuthority?: CloudAuthority;

  constructor(options: SessionCoreOptions) {
    this.project = options.project;

    this.identity = createSessionIdentity(options.project, options.agent, options.nativeSessionId);

    this.title = options.title;

    this.metadata = this.sanitizer.sanitizeValue(options.metadata ?? {}) as Record<string, unknown>;

    // v0.7: Use in-memory WAL in strict cloud-only mode to avoid disk writes
    const mode = resolveDurabilityMode(process.env.TOOLNET_DURABILITY_MODE);
    if (mode === 'strict-cloud-only') {
      this.wal = new InMemorySessionWal(this.identity, options.eventContext);
    } else {
      this.wal = new SessionWal(this.identity, options.eventContext);
    }

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

    this.materializer = new SessionMemoryMaterializer(options.storage);

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

    // v0.7 automatic checkpoint integration - initialize if cloud authority is available
    if (hasCloudAuthorityConfig()) {
      try {
        const authority = createCloudAuthorityFromEnv();
        const mode = resolveDurabilityMode(process.env.TOOLNET_DURABILITY_MODE);

        const checkpointOptions: CloudCheckpointSessionOptions = {
          authority,
          projectId: this.identity.projectId,
          agentId: this.taskAgentId,
          mode,
          capacity: 128,
          leaseTtlMs: 120_000,
          maxWaitForLeaseMs: 0,
          retry: { attempts: 3, baseDelayMs: 25, maxDelayMs: 1_000 },
          now: () => Date.now(),
          sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        };

        this.cloudAuthority = authority;
        this.checkpointSession = new CloudCheckpointSession(checkpointOptions);
      } catch {
        // Cloud authority unavailable - checkpoint integration is optional
        this.checkpointSession = undefined;
        this.cloudAuthority = undefined;
      }
    } else {
      this.checkpointSession = undefined;
      this.cloudAuthority = undefined;
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

    // v0.7 automatic checkpoint integration - record checkpoint if cloud authority is available
    if (this.checkpointSession && events.length > 0) {
      try {
        const lastEvent = events[events.length - 1];
        const checkpointType = this.mapEventTypeToCheckpointType(lastEvent.type, lastEvent.data);
        let checkpointEvent: AgentCheckpointEvent;

        switch (checkpointType) {
          case 'task.started': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'task.started',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              ...(lastEvent.data?.title !== undefined && { title: lastEvent.data.title as string }),
              ...(lastEvent.data?.nextAction !== undefined && {
                nextAction: lastEvent.data.nextAction as string,
              }),
            };
            break;
          }
          case 'task.updated': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'task.updated',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              ...(lastEvent.data?.nextAction !== undefined && {
                nextAction: lastEvent.data.nextAction as string,
              }),
            };
            break;
          }
          case 'file.changed': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'file.changed',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              path: lastEvent.data?.path as string,
            };
            break;
          }
          case 'test.passed': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'test.passed',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              name: lastEvent.data?.name as string,
            };
            break;
          }
          case 'test.failed': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'test.failed',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              name: lastEvent.data?.name as string,
            };
            break;
          }
          case 'blocker.detected': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'blocker.detected',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              reason: lastEvent.data?.reason as string,
              ...(lastEvent.data?.nextAction !== undefined && {
                nextAction: lastEvent.data.nextAction as string,
              }),
            };
            break;
          }
          case 'blocker.resolved': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'blocker.resolved',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              ...(lastEvent.data?.nextAction !== undefined && {
                nextAction: lastEvent.data.nextAction as string,
              }),
            };
            break;
          }
          case 'decision.changed': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'decision.changed',
              text: lastEvent.data?.text as string,
            };
            break;
          }
          case 'next_action.updated': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'next_action.updated',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
              nextAction: lastEvent.data?.nextAction as string,
            };
            break;
          }
          case 'session.interrupted': {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'session.interrupted',
              ...(lastEvent.data?.reason !== undefined && {
                reason: lastEvent.data.reason as string,
              }),
            };
            break;
          }
          default: {
            checkpointEvent = {
              id: lastEvent.id,
              type: 'task.updated',
              ...(lastEvent.data?.taskId !== undefined && {
                taskId: lastEvent.data.taskId as string,
              }),
            };
          }
        }

        // Asynchronously record checkpoint (non-blocking for session capture)
        this.checkpointSession.record(checkpointEvent).catch(() => {
          // Checkpoint failures should not break session capture
        });
      } catch {
        // Checkpoint recording should not break session capture
      }
    }
  }

  private mapEventTypeToCheckpointType(
    eventType: SessionEventType,
    eventData?: Record<string, unknown>
  ): AgentCheckpointEvent['type'] {
    // Map session event types to checkpoint event types
    // For 'test' events, check the outcome from event data
    if (eventType === 'test') {
      const outcome = eventData?.outcome;
      return outcome === 'fail' ? 'test.failed' : 'test.passed';
    }

    // For 'custom' events, check if they represent task lifecycle or other checkpoint events
    if (eventType === 'custom') {
      const customEvent = eventData?.event as string | undefined;
      if (customEvent === 'task_started' || customEvent === 'task.created') return 'task.started';
      if (customEvent === 'task_updated' || customEvent === 'task.status.set')
        return 'task.updated';
      if (customEvent === 'task_completed') return 'task.completed';
      if (customEvent === 'blocker_detected') return 'blocker.detected';
      if (customEvent === 'blocker_resolved') return 'blocker.resolved';
      if (customEvent === 'decision_changed') return 'decision.changed';
      if (customEvent === 'next_action_updated') return 'next_action.updated';
      if (customEvent === 'file_changed') return 'file.changed';
    }

    const typeMap: Record<string, AgentCheckpointEvent['type']> = {
      tool_call: 'file.changed',
      file_write: 'file.changed',
      file_edit: 'file.changed',
      decision: 'decision.changed',
      todo: 'next_action.updated',
    };

    return typeMap[eventType] || 'task.updated';
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

    // v0.7: Start cloud checkpoint session if available
    if (this.checkpointSession) {
      try {
        await this.checkpointSession.start({ takeover: false });
      } catch {
        // Checkpoint session start failure should not break session startup
      }
    }

    try {
      this.taskSelfHealingResultValue = await recoverSessionTaskState(
        this.project,
        this.wal,
        this.taskMirror
      );
      await this.taskMirror.drain();
      try {
        refreshCurrentWorkProjection(this.project, {
          agentId: this.taskAgentId,
        });
      } catch {
        // Current work is a derived projection and must not break session startup.
      }
      this.taskExecutionResolutionValue = await resolveTaskSessionExecutionWithAutoRecovery(
        { id: this.project.id, rootPath: this.project.rootPath },
        {
          agentId: this.taskAgentId,
          nativeSessionId: this.identity.nativeSessionId,
          now: Date.now(),
        }
      );
      try {
        /*
         * resolveTaskSessionExecution() may opt-in recover/claim a Task.
         * Refresh once more so lease ownership is immediately visible.
         */
        refreshCurrentWorkProjection(this.project, {
          agentId: this.taskAgentId,
        });
      } catch {
        // Derived projection only.
      }
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
    try {
      refreshCurrentWorkProjection(this.project, {
        agentId: this.taskAgentId,
      });
    } catch {
      // Current work is a derived projection and must not break session flush.
    }

    // Learn new WAL events into the immutable learned journal
    await this.learner.learnNew({ includeDerivedProjections: true });

    // Learn new WAL events into work continuity journal
    await this.continuity.learnNew();

    // Learn new WAL events into semantic work journal
    await this.semantic.learnNew();

    // Materialize learned memory batches into canonical MemoryStore
    const materialization = await this.materializer.materialize(this.project, this.identity);

    return {
      uploadedEvents: result.uploadedEvents,
      lastRemoteSequence: result.lastRemoteSequence,
      eventCount: result.eventCount,
      chunkCount: result.chunkCount,

      status: result.status,

      materialization: {
        status: materialization.status,

        batchesScanned: materialization.batchesScanned,

        candidates: materialization.candidates,

        added: materialization.added,

        duplicates: materialization.duplicates,

        memories: materialization.memories,

        evidenceUpdated: materialization.evidenceUpdated,

        operationId: materialization.operationId,

        durationMs: materialization.durationMs,

        ...(materialization.errorCode ? { errorCode: materialization.errorCode } : {}),
      },
    };
  }

  async idle(data: Record<string, unknown> = {}): Promise<SessionFlushResult> {
    this.record({
      type: 'session_idle',

      data,

      provenance: {
        source: this.identity.agent,
      },
    });

    // v0.7: Record session interrupted checkpoint and release lease
    if (this.checkpointSession) {
      try {
        await this.checkpointSession.record({
          type: 'session.interrupted',
          reason: 'session_idle',
        });
        await this.checkpointSession.release();
      } catch {
        // Checkpoint failures should not break session idle
      }
    }

    // Capture smart handoff for unfinished work
    const state = this.wal.loadState();
    try {
      await this.handoff.capture((data.reason as string) ?? 'session_idle', state.lastSequence);
    } catch {
      // Handoff capture failures should not break session idle
    }

    return this.flush();
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

  // v0.7 automatic checkpoint status
  checkpointStatus() {
    return this.checkpointSession?.status();
  }

  // v0.7 automatic resume context
  async getResumeContext(
    options: {
      mode?: 'tiny' | 'standard' | 'full';
      budgetTokens?: number;
      currentCodeRevision?: string;
    } = {}
  ): Promise<CloudResumeResult | null> {
    if (!this.cloudAuthority) {
      return null;
    }

    try {
      return await resumeFromCloud({
        authority: this.cloudAuthority,
        projectId: this.identity.projectId,
        mode: options.mode,
        budgetTokens: options.budgetTokens,
        currentCodeRevision: options.currentCodeRevision,
      });
    } catch {
      return null;
    }
  }
}
