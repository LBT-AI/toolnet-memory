import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import { taskRecords, unresolvedTaskDependencies } from './projection.js';
import { taskLeaseActiveAt } from './handoff-projection.js';
import {
  TaskHandoffEngine,
  type TaskClaimResult,
  type TaskLeaseOptions,
} from './handoff-engine.js';
import { TaskStateEngine } from './state-engine.js';
import { TaskStore } from './store.js';
import type {
  TaskActor,
  TaskBlocker,
  TaskHandoffRecord,
  TaskRecord,
  TaskTestRecord,
} from './types.js';
import type { TaskReplicationConflict } from './replication/types.js';
import type { TaskMirrorBindingRecord } from './mirror-binding-types.js';
import { TaskMirrorBindingStore } from './mirror-binding-store.js';
import { taskMirrorTaskId } from './mirror-identity.js';

export interface TaskExecutionContext {
  taskId: string;
  title: string;
  status: TaskRecord['status'];
  progress: TaskRecord['progress'];
  blocker?: TaskBlocker;
  nextAction?: string;
  dependencies: TaskRecord[];
  filesTouched: string[];
  tests: TaskTestRecord[];
  evidence: string[];
  completion?: TaskRecord['completion'];
  lastAgentId?: string;
  handoffHistory: TaskHandoffRecord[];
  sourceBinding?: {
    provider: string;
    nativeSessionId: string;
    sourceKey: string;
  };
}

export type SessionExecutionMode = 'owned' | 'handoff' | 'recoverable' | 'recommended' | 'none';

export interface SessionExecutionResolution {
  mode: SessionExecutionMode;
  task?: TaskRecord;
  context?: TaskExecutionContext;
  reason: string;
  requiresClaim: boolean;
}

export interface SessionExecutionOptions {
  agentId: string;
  nativeSessionId?: string;
  now?: number;
  autoRecover?: boolean;
}

export interface SessionExecutionBootstrapOptions extends SessionExecutionOptions {
  maxChars?: number;
}

export interface TaskOrchestrationDecision {
  task?: TaskRecord;
  why: 'owned-lease-resume' | 'priority-ready' | 'no-ready-task';
  dependencies: TaskRecord[];
  leaseStatus: 'unleased' | 'owned-by-requester' | 'owned-by-other' | 'expired';
  resumeContext?: TaskExecutionContext;
  conflicts: TaskReplicationConflict[];
}

export interface TaskConflictReader {
  (): TaskReplicationConflict[];
}

export interface TaskHeartbeatRuntimeStatus {
  running: boolean;
  taskId?: string;
  agentId?: string;
  beats: number;
  failures: number;
  lastError?: string;
}

const PRIORITY_RANK: Record<TaskRecord['priority'], number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function requiredAgent(value: string): string {
  const normalized = sanitizeDurableText(value).trim();
  if (!normalized) {
    throw new Error('TASK_AGENT_ID_REQUIRED');
  }
  return normalized;
}

function nowValue(value?: number): number {
  const now = value ?? Date.now();
  if (!Number.isFinite(now)) {
    throw new Error('TASK_OPERATION_TIME_INVALID');
  }
  return Math.trunc(now);
}

function terminal(task: TaskRecord): boolean {
  return task.status === 'completed' || task.status === 'cancelled';
}

function conflictIds(task: TaskRecord): Set<string> {
  return new Set((task.resolvedConflicts ?? []).map((item) => item.conflictId));
}

function taskConflicts(task: TaskRecord, reader: TaskConflictReader): TaskReplicationConflict[] {
  const resolved = conflictIds(task);
  return reader().filter((conflict) => conflict.taskId === task.id && !resolved.has(conflict.id));
}

function bindingTaskId(projectId: string, binding: TaskMirrorBindingRecord): string {
  return taskMirrorTaskId(
    {
      version: 1,
      projectId,
      provider: binding.provider,
      agentId: binding.agentId,
      nativeSessionId: binding.nativeSessionId,
      ...(binding.planId ? { planId: binding.planId } : {}),
      mode: 'full',
      sourceEventId: binding.lastSourceEventId,
      observedAt: binding.lastSeenAt,
      items: [],
    },
    {
      sourceKey: binding.canonicalSourceKey,
      title: binding.title,
      status: binding.status,
      order: binding.order,
    }
  );
}

function leaseStatus(
  task: TaskRecord,
  agentId: string,
  now: number
): TaskOrchestrationDecision['leaseStatus'] {
  const lease = task.activeLease;
  if (!lease) {
    return 'unleased';
  }
  if (!taskLeaseActiveAt(lease, now)) {
    return 'expired';
  }
  return lease.agentId === agentId ? 'owned-by-requester' : 'owned-by-other';
}

function ready(
  task: TaskRecord,
  projection: ReturnType<TaskStore['projection']>,
  now: number
): boolean {
  if (task.status !== 'pending' && task.status !== 'active') {
    return false;
  }
  if (task.blocker || unresolvedTaskDependencies(projection.tasks, task).length > 0) {
    return false;
  }
  if (task.activeLease && taskLeaseActiveAt(task.activeLease, now)) {
    return false;
  }
  return true;
}

function compareReady(left: TaskRecord, right: TaskRecord): number {
  return (
    PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority] ||
    left.order - right.order ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export class TaskOrchestrationEngine {
  private readonly state: TaskStateEngine;
  private readonly handoffEngine: TaskHandoffEngine;
  private readonly readConflicts: TaskConflictReader;

  constructor(
    private readonly store: TaskStore,
    readConflicts: TaskConflictReader = () => []
  ) {
    this.state = new TaskStateEngine(store);
    this.handoffEngine = new TaskHandoffEngine(store);
    this.readConflicts = readConflicts;
  }

  private task(taskId: string): TaskRecord {
    const task = this.store.getTask(taskId);
    if (!task) {
      throw new Error(`TASK_NOT_FOUND id=${taskId}`);
    }
    return task;
  }

  private taskConflicts(task: TaskRecord): TaskReplicationConflict[] {
    return taskConflicts(task, this.readConflicts);
  }

  private assertNoConflict(task: TaskRecord): void {
    const conflicts = this.taskConflicts(task);
    if (conflicts.length === 0) {
      return;
    }
    throw new Error(`TASK_REPLICATION_CONFLICT ${conflicts.map((item) => item.id).join(' ')}`);
  }

  private assertClaimable(task: TaskRecord): void {
    if (terminal(task)) {
      throw new Error(`TASK_CLAIM_TERMINAL status=${task.status}`);
    }
    if (task.status === 'blocked') {
      throw new Error('TASK_CLAIM_BLOCKED');
    }
    const dependencies = unresolvedTaskDependencies(this.store.projection().tasks, task);
    if (dependencies.length > 0) {
      throw new Error(
        ['TASK_CLAIM_DEPENDENCIES_PENDING', ...dependencies.map((item) => item.id)].join(' ')
      );
    }
    this.assertNoConflict(task);
  }

  async claim(
    taskId: string,
    agentId: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskClaimResult> {
    const task = this.task(taskId);
    this.assertClaimable(task);
    return this.handoffEngine.claim(task.id, requiredAgent(agentId), options);
  }

  async heartbeat(
    taskId: string,
    agentId: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskRecord> {
    const task = this.task(taskId);
    this.assertNoConflict(task);
    return this.handoffEngine.heartbeat(task.id, requiredAgent(agentId), options);
  }

  async release(
    taskId: string,
    agentId: string,
    reason?: string,
    options: Pick<TaskLeaseOptions, 'expectedRevision' | 'now'> = {}
  ): Promise<TaskRecord> {
    const task = this.task(taskId);
    this.assertNoConflict(task);
    return this.handoffEngine.release(task.id, requiredAgent(agentId), reason, options);
  }

  async handoff(
    taskId: string,
    fromAgentId: string,
    toAgentId: string,
    reason?: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskRecord> {
    const task = this.task(taskId);
    this.assertNoConflict(task);
    return this.handoffEngine.handoff(
      task.id,
      requiredAgent(fromAgentId),
      requiredAgent(toAgentId),
      reason,
      options
    );
  }

  async complete(
    taskId: string,
    agentId?: string,
    options: { expectedRevision?: number } = {}
  ): Promise<TaskRecord> {
    const task = this.task(taskId);
    this.assertNoConflict(task);
    if (agentId) {
      const requester = requiredAgent(agentId);
      const lease = task.activeLease;
      if (!lease) {
        throw new Error('TASK_LEASE_NOT_FOUND');
      }
      if (lease.agentId !== requester) {
        throw new Error('TASK_COMPLETION_OWNER_MISMATCH');
      }
      if (!taskLeaseActiveAt(lease, Date.now())) {
        throw new Error('TASK_LEASE_EXPIRED');
      }
    }
    return this.state.complete(task.id, {
      ...(options.expectedRevision !== undefined
        ? { expectedRevision: options.expectedRevision }
        : {}),
      ...(agentId
        ? {
            actor: {
              kind: 'agent' as const,
              id: requiredAgent(agentId),
            },
          }
        : {}),
    });
  }

  resolveConflict(
    taskId: string,
    conflictId: string,
    actor: TaskActor,
    leaseOwner?: string,
    expectedRevision?: number
  ): Promise<TaskRecord> {
    const task = this.task(taskId);
    const normalizedConflict = sanitizeDurableText(conflictId).trim();
    if (!normalizedConflict) {
      throw new Error('TASK_CONFLICT_ID_REQUIRED');
    }
    const known = this.taskConflicts(task).some((conflict) => conflict.id === normalizedConflict);
    if (!known) {
      throw new Error('TASK_CONFLICT_NOT_FOUND');
    }
    return this.store
      .applyStateOperation(
        {
          type: 'task.replication.conflict.resolved',
          taskId: task.id,
          conflictId: normalizedConflict,
          ...(leaseOwner ? { leaseOwner: requiredAgent(leaseOwner) } : {}),
          ...(expectedRevision !== undefined ? { expectedRevision } : {}),
        },
        actor
      )
      .then((projection) => projection.tasks[task.id]!);
  }

  private sourceBinding(taskId: string): TaskExecutionContext['sourceBinding'] | undefined {
    const bindings = new TaskMirrorBindingStore(this.store.projectManifest()).projection();
    for (const scope of Object.values(bindings.scopes)) {
      for (const binding of scope.bindings) {
        if (bindingTaskId(bindings.projectId, binding) !== taskId) {
          continue;
        }
        return {
          provider: binding.provider,
          nativeSessionId: binding.nativeSessionId,
          sourceKey: binding.canonicalSourceKey,
        };
      }
    }
    return undefined;
  }

  resumeContext(taskId: string): TaskExecutionContext {
    const task = this.task(taskId);
    const projection = this.store.projection();
    const dependencies = task.dependencies
      .map((id) => projection.tasks[id])
      .filter((item): item is TaskRecord => Boolean(item));
    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
      progress: { ...task.progress },
      ...(task.blocker ? { blocker: { ...task.blocker } } : {}),
      ...(task.nextAction ? { nextAction: task.nextAction } : {}),
      dependencies,
      filesTouched: [...task.filesTouched],
      tests: task.tests.map((item) => ({ ...item })),
      evidence: task.evidence.map((item) => item.summary),
      ...(task.completion ? { completion: task.completion } : {}),
      ...(task.lastAgentId ? { lastAgentId: task.lastAgentId } : {}),
      ...(this.sourceBinding(task.id) ? { sourceBinding: this.sourceBinding(task.id) } : {}),
      handoffHistory: task.handoffHistory.map((item) => ({ ...item })),
    };
  }

  resolveSessionExecution(options: SessionExecutionOptions): SessionExecutionResolution {
    const agentId = requiredAgent(options.agentId);
    const now = nowValue(options.now);
    const projection = this.store.projection();
    const tasks = taskRecords(projection);

    const handoff = tasks.find(
      (task) =>
        !terminal(task) &&
        task.activeLease?.agentId === agentId &&
        task.handoffHistory.at(-1)?.toAgentId === agentId &&
        taskLeaseActiveAt(task.activeLease, now) &&
        this.taskConflicts(task).length === 0
    );
    if (handoff) {
      return {
        mode: 'handoff',
        task: handoff,
        context: this.resumeContext(handoff.id),
        reason: 'explicit-handoff-to-agent',
        requiresClaim: false,
      };
    }

    const owned = tasks.find(
      (task) =>
        !terminal(task) &&
        task.activeLease?.agentId === agentId &&
        taskLeaseActiveAt(task.activeLease, now) &&
        this.taskConflicts(task).length === 0
    );
    if (owned) {
      return {
        mode: 'owned',
        task: owned,
        context: this.resumeContext(owned.id),
        reason: 'existing-valid-lease',
        requiresClaim: false,
      };
    }

    const recoverable = tasks
      .filter(
        (task) =>
          !terminal(task) &&
          Boolean(task.activeLease) &&
          !taskLeaseActiveAt(task.activeLease, now) &&
          task.lastAgentId === agentId &&
          this.taskConflicts(task).length === 0
      )
      .sort(compareReady)[0];
    if (recoverable) {
      return {
        mode: 'recoverable',
        task: recoverable,
        context: this.resumeContext(recoverable.id),
        reason:
          process.env.TOOLNET_TASK_AUTO_RECOVER === '1'
            ? 'expired-lease-auto-recovery-enabled'
            : 'expired-lease-awaiting-explicit-claim',
        requiresClaim: true,
      };
    }

    if (
      tasks.some(
        (task) =>
          !terminal(task) &&
          task.activeLease &&
          task.activeLease.agentId !== agentId &&
          taskLeaseActiveAt(task.activeLease, now)
      )
    ) {
      return {
        mode: 'none',
        reason: 'valid-foreign-lease-present',
        requiresClaim: false,
      };
    }

    const recommended = tasks
      .filter((task) => ready(task, projection, now) && this.taskConflicts(task).length === 0)
      .sort(compareReady)[0];
    if (recommended) {
      return {
        mode: 'recommended',
        task: recommended,
        context: this.resumeContext(recommended.id),
        reason: 'deterministic-ready-task',
        requiresClaim: true,
      };
    }
    return {
      mode: 'none',
      reason: 'no-executable-task',
      requiresClaim: false,
    };
  }

  buildSessionExecutionContext(options: SessionExecutionOptions): SessionExecutionResolution {
    return this.resolveSessionExecution(options);
  }

  renderSessionExecutionBootstrap(options: SessionExecutionBootstrapOptions): string {
    const maxChars = Math.max(512, Math.min(8_000, Math.trunc(options.maxChars ?? 4_000)));
    const resolution = this.resolveSessionExecution(options);
    if (!resolution.task || !resolution.context) {
      return `[TOOLNET TASK RESUME]\n\nNo executable Task is currently assigned to ${requiredAgent(options.agentId)}.\nReason: ${resolution.reason}`.slice(
        0,
        maxChars
      );
    }
    const context = resolution.context;
    const lines = [
      '[TOOLNET TASK RESUME]',
      '',
      `Task: ${sanitizeDurableText(context.title)}`,
      `Status: ${context.status}`,
      `Progress: ${context.progress.completed}/${context.progress.total}`,
      ...(context.lastAgentId ? [`Agent: ${sanitizeDurableText(context.lastAgentId)}`] : []),
      `Reason: ${resolution.reason}`,
      ...(context.nextAction ? ['', 'Next:', sanitizeDurableText(context.nextAction)] : []),
      ...(context.blocker ? ['', 'Blocker:', sanitizeDurableText(context.blocker.reason)] : []),
      ...(context.filesTouched.length > 0
        ? [
            '',
            'Files:',
            ...context.filesTouched.slice(0, 32).map((file) => `- ${sanitizeDurableText(file)}`),
          ]
        : []),
      ...(context.tests.length > 0
        ? [
            '',
            'Tests:',
            ...context.tests
              .slice(0, 16)
              .map((test) => `- [${test.outcome}] ${sanitizeDurableText(test.name)}`),
          ]
        : []),
      ...(context.handoffHistory.length > 0
        ? [
            '',
            'Recent handoff:',
            `${sanitizeDurableText(context.handoffHistory.at(-1)!.fromAgentId)} → ${sanitizeDurableText(context.handoffHistory.at(-1)!.toAgentId)}${context.handoffHistory.at(-1)!.reason ? `: ${sanitizeDurableText(context.handoffHistory.at(-1)!.reason!)}` : ''}`,
          ]
        : []),
    ];
    const rendered = lines.join('\n');
    if (rendered.length <= maxChars) {
      return rendered;
    }
    return `${rendered.slice(0, maxChars - 40)}\n\n[ToolNet resume context truncated]`;
  }

  resolveNextTask(rootTaskId: string, agentId: string, at?: number): TaskOrchestrationDecision {
    const requester = requiredAgent(agentId);
    const now = nowValue(at);
    const projection = this.store.projection();
    const root = projection.tasks[rootTaskId];
    if (!root) {
      throw new Error(`TASK_NOT_FOUND id=${rootTaskId}`);
    }
    const children = taskRecords(projection).filter((task) => task.parentTaskId === root.id);
    const scope = children.length > 0 ? children : [root];
    const conflictsByTask = new Map(
      scope.map((task) => [task.id, taskConflicts(task, this.readConflicts)])
    );
    const owned = scope.find(
      (task) =>
        !terminal(task) &&
        !task.blocker &&
        task.activeLease?.agentId === requester &&
        taskLeaseActiveAt(task.activeLease, now) &&
        (conflictsByTask.get(task.id)?.length ?? 0) === 0
    );
    const candidate =
      owned ??
      scope
        .filter((task) => ready(task, projection, now))
        .filter((task) => (conflictsByTask.get(task.id)?.length ?? 0) === 0)
        .sort(compareReady)[0];
    if (!candidate) {
      return {
        why: 'no-ready-task',
        dependencies: [],
        leaseStatus: 'unleased',
        conflicts: scope.flatMap((task) => conflictsByTask.get(task.id) ?? []),
      };
    }
    const dependencies = unresolvedTaskDependencies(projection.tasks, candidate);
    return {
      task: candidate,
      why: owned ? 'owned-lease-resume' : 'priority-ready',
      dependencies,
      leaseStatus: leaseStatus(candidate, requester, now),
      resumeContext: this.resumeContext(candidate.id),
      conflicts: conflictsByTask.get(candidate.id) ?? [],
    };
  }

  claimNext(
    rootTaskId: string,
    agentId: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskClaimResult> {
    const decision = this.resolveNextTask(rootTaskId, agentId, options.now);
    if (!decision.task) {
      throw new Error('TASK_NO_RESUMABLE_WORK');
    }
    if (decision.why === 'owned-lease-resume') {
      return Promise.resolve({
        task: decision.task,
        lease: decision.task.activeLease!,
        acquired: false,
        takeover: false,
      });
    }
    return this.claim(decision.task.id, agentId, {
      ...options,
      expectedRevision: decision.task.revision,
    });
  }
}

export class TaskHeartbeatRuntime {
  private timer?: ReturnType<typeof setInterval>;
  private activeTaskId?: string;
  private activeAgentId?: string;
  private beats = 0;
  private failures = 0;
  private lastError?: string;

  constructor(private readonly orchestration: TaskOrchestrationEngine) {}

  start(taskId: string, agentId: string, intervalMs = 60_000): void {
    this.stop();
    const safeInterval = Math.max(30_000, Math.trunc(intervalMs));
    this.activeTaskId = taskId;
    this.activeAgentId = requiredAgent(agentId);
    this.timer = setInterval(() => {
      void this.tick();
    }, safeInterval);
  }

  private async tick(): Promise<void> {
    if (!this.timer || !this.activeTaskId || !this.activeAgentId) {
      return;
    }
    try {
      const task = await this.orchestration.heartbeat(this.activeTaskId, this.activeAgentId);
      this.beats += 1;
      this.lastError = undefined;
      if (terminal(task)) {
        this.stop();
      }
    } catch (error) {
      this.failures += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.stop();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = undefined;
    this.activeTaskId = undefined;
    this.activeAgentId = undefined;
  }

  status(): TaskHeartbeatRuntimeStatus {
    return {
      running: Boolean(this.timer),
      ...(this.activeTaskId ? { taskId: this.activeTaskId } : {}),
      ...(this.activeAgentId ? { agentId: this.activeAgentId } : {}),
      beats: this.beats,
      failures: this.failures,
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }
}
