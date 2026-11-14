import { Sanitizer } from '../security/sanitizer.js';

import type {
  LocalSessionState,
  NormalizedSessionEvent,
  SessionCoreOptions,
  SessionEventInput,
  SessionEventType,
  SessionFlushResult,
} from './types.js';

import { createSessionIdentity } from './identity.js';

import { RemoteSessionStore } from './store.js';

import { SessionWal } from './wal.js';

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

export class SessionCore {
  readonly identity;

  readonly wal: SessionWal;

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

        this.checkpointSession = new CloudCheckpointSession(checkpointOptions);
      } catch {
        // Cloud authority unavailable - checkpoint integration is optional
        this.checkpointSession = undefined;
      }
    } else {
      this.checkpointSession = undefined;
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
        const checkpointType = this.mapEventTypeToCheckpointType(lastEvent.type);
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

  private mapEventTypeToCheckpointType(eventType: SessionEventType): AgentCheckpointEvent['type'] {
    // Map session event types to checkpoint event types
    const typeMap: Record<string, AgentCheckpointEvent['type']> = {
      'task.lifecycle.transition': 'task.updated',
      'task.created': 'task.started',
      'task.status.set': 'task.updated',
      'test.recorded': 'test.passed',
      'test.failed': 'test.failed',
      'blocker.detected': 'blocker.detected',
      'blocker.resolved': 'blocker.resolved',
      'decision.add': 'decision.changed',
      'task.work': 'next_action.updated',
      'task.evidence.add': 'task.updated',
      'file.changed': 'file.changed',
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

    return {
      uploadedEvents: result.uploadedEvents,
      lastRemoteSequence: result.lastRemoteSequence,
      eventCount: result.eventCount,
      chunkCount: result.chunkCount,

      status: result.status,

      materialization: result.materialization
        ? {
            status: result.materialization.status,

            batchesScanned: result.materialization.batchesScanned,

            candidates: result.materialization.candidates,

            added: result.materialization.added,

            duplicates: result.materialization.duplicates,

            memories: result.materialization.memories,

            evidenceUpdated: result.materialization.evidenceUpdated,

            operationId: result.materialization.operationId,

            durationMs: result.materialization.durationMs,

            ...(result.materialization.errorCode
              ? { errorCode: result.materialization.errorCode }
              : {}),
          }
        : undefined,
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
}
