import { createHash } from 'node:crypto';
import type { ProjectManifest } from '../core/types.js';
import { taskLeaseActiveAt } from './handoff-projection.js';
import { DEFAULT_TASK_LEASE_MS, TaskHandoffEngine } from './handoff-engine.js';
import { taskMirrorTaskId } from './mirror-identity.js';
import { TaskStateEngine } from './state-engine.js';
import { TaskStore } from './store.js';
import type {
  AgentPlanSnapshot,
  TaskMirrorAction,
  TaskMirrorPlan,
  TaskMirrorTransitionAction,
} from './mirror-types.js';
import type { TaskActor, TaskRecord } from './types.js';

export interface TaskMirrorMutationOptions {
  now?: () => number;
  leaseMs?: number;
  /** Renew an owned lease only when remaining time falls below this threshold. */
  heartbeatThresholdMs?: number;
}

export interface TaskMirrorMutationConflict {
  taskId?: string;
  sourceKey?: string;
  action?: TaskMirrorAction['type'];
  code: string;
  message: string;
}

export interface TaskMirrorMutationExecution {
  projectId: string;
  provider: string;
  agentId: string;
  nativeSessionId: string;
  sourceEventId: string;
  goalTaskId?: string;
  created: number;
  patched: number;
  transitioned: number;
  claimed: number;
  heartbeated: number;
  released: number;
  noops: number;
  conflicts: TaskMirrorMutationConflict[];
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function terminal(task: TaskRecord): boolean {
  return task.status === 'completed' || task.status === 'cancelled';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(message: string): string {
  return message.trim().split(/\s+/u)[0] || 'TASK_MIRROR_MUTATION_ERROR';
}

function revisionConflict(error: unknown): boolean {
  return errorMessage(error).startsWith('TASK_REVISION_CONFLICT');
}

function expectedConflict(error: unknown): boolean {
  const message = errorMessage(error);
  return [
    'TASK_COMPLETE_',
    'TASK_ALREADY_CLAIMED',
    'TASK_CLAIM_TERMINAL',
    'TASK_LEASE_',
    'TASK_LIFECYCLE_INVALID',
    'TASK_RESUME_REQUIRES_BLOCKED',
    'TASK_NOT_FOUND',
  ].some((prefix) => message.startsWith(prefix));
}

function providerLabel(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gu, '-')
      .replace(/-+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 48) || 'agent'
  );
}

export function taskMirrorGoalId(
  plan: Pick<TaskMirrorPlan, 'projectId' | 'provider' | 'nativeSessionId' | 'planId'>
): string {
  const digest = hash(
    [
      plan.projectId,
      plan.provider,
      plan.nativeSessionId,
      plan.planId ?? '',
      'native-plan-goal',
    ].join('\u0000')
  ).slice(0, 40);
  return `mirror-goal-${digest}`;
}

function goalTitle(provider: string): string {
  return `${provider.charAt(0).toUpperCase()}${provider.slice(1)} native plan`;
}

function agentActor(agentId: string): TaskActor {
  return { kind: 'agent', id: agentId };
}

export class TaskMirrorMutationExecutor {
  private readonly state: TaskStateEngine;
  private readonly handoff: TaskHandoffEngine;
  private readonly now: () => number;
  private readonly leaseMs: number;
  private readonly heartbeatThresholdMs: number;

  constructor(
    private readonly project: Pick<ProjectManifest, 'id' | 'rootPath'>,
    private readonly store: TaskStore,
    options: TaskMirrorMutationOptions = {}
  ) {
    this.state = new TaskStateEngine(store);
    this.handoff = new TaskHandoffEngine(store);
    this.now = options.now ?? (() => Date.now());
    this.leaseMs = options.leaseMs ?? DEFAULT_TASK_LEASE_MS;
    this.heartbeatThresholdMs =
      options.heartbeatThresholdMs ?? Math.max(30_000, Math.floor(this.leaseMs / 3));
  }

  private conflict(result: TaskMirrorMutationExecution, input: TaskMirrorMutationConflict): void {
    result.conflicts.push(input);
  }

  private task(taskId: string): TaskRecord | undefined {
    return this.store.getTask(taskId);
  }

  private replicationConflict(taskId: string): string | undefined {
    const task = this.task(taskId);
    if (!task) {
      return undefined;
    }
    const resolved = new Set((task.resolvedConflicts ?? []).map((item) => item.conflictId));
    const conflict = this.store
      .replicationConflicts()
      .find((item) => item.taskId === taskId && !resolved.has(item.id));
    return conflict?.id;
  }

  private async ensureGoal(
    plan: TaskMirrorPlan,
    result: TaskMirrorMutationExecution
  ): Promise<string | undefined> {
    if (plan.itemCount === 0) {
      return undefined;
    }
    const goalId = taskMirrorGoalId(plan);
    result.goalTaskId = goalId;
    let current = this.task(goalId);
    if (!current) {
      try {
        current = await this.store.createTask({
          id: goalId,
          kind: 'goal',
          title: goalTitle(plan.provider),
          labels: ['toolnet:native-plan', `provider:${providerLabel(plan.provider)}`],
          actor: agentActor(plan.agentId),
        });
        result.created += 1;
      } catch (error) {
        if (!errorMessage(error).startsWith('TASK_ALREADY_EXISTS')) {
          throw error;
        }
        current = this.task(goalId);
      }
    }
    if (!current) {
      throw new Error(`TASK_MIRROR_GOAL_MISSING_AFTER_CREATE id=${goalId}`);
    }
    if (current.kind !== 'goal') {
      this.conflict(result, {
        taskId: goalId,
        code: 'TASK_MIRROR_GOAL_KIND_CONFLICT',
        message: `Existing mirror root is kind=${current.kind}`,
      });
      return goalId;
    }
    if (current.status === 'pending') {
      try {
        await this.state.start(goalId, {
          expectedRevision: current.revision,
          actor: agentActor(plan.agentId),
        });
        result.transitioned += 1;
      } catch (error) {
        if (revisionConflict(error) && this.task(goalId)?.status === 'active') {
          result.noops += 1;
          return goalId;
        }
        throw error;
      }
    }
    return goalId;
  }

  private async ensureCreate(
    action: Extract<TaskMirrorAction, { type: 'create' }>,
    plan: TaskMirrorPlan,
    goalTaskId: string | undefined,
    result: TaskMirrorMutationExecution
  ): Promise<void> {
    const existing = this.task(action.taskId);
    if (existing) {
      if (existing.kind !== 'task') {
        this.conflict(result, {
          taskId: action.taskId,
          sourceKey: action.sourceKey,
          action: 'create',
          code: 'TASK_MIRROR_KIND_CONFLICT',
          message: `Existing Task has kind=${existing.kind}`,
        });
        return;
      }
      if (existing.parentTaskId !== goalTaskId) {
        this.conflict(result, {
          taskId: action.taskId,
          sourceKey: action.sourceKey,
          action: 'create',
          code: 'TASK_MIRROR_PARENT_CONFLICT',
          message: 'Existing Task parent differs from mirror goal',
        });
        return;
      }
      result.noops += 1;
      return;
    }
    try {
      await this.store.createTask({
        id: action.taskId,
        kind: 'task',
        ...(goalTaskId ? { parentTaskId: goalTaskId } : {}),
        title: action.title,
        order: action.order,
        labels: ['toolnet:native-task', `provider:${providerLabel(plan.provider)}`],
        actor: agentActor(plan.agentId),
      });
      result.created += 1;
    } catch (error) {
      if (errorMessage(error).startsWith('TASK_ALREADY_EXISTS') && this.task(action.taskId)) {
        result.noops += 1;
        return;
      }
      throw error;
    }
  }

  private async ensurePatch(
    action: Extract<TaskMirrorAction, { type: 'patch' }>,
    plan: TaskMirrorPlan,
    result: TaskMirrorMutationExecution
  ): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = this.task(action.taskId);
      if (!current) {
        this.conflict(result, {
          taskId: action.taskId,
          sourceKey: action.sourceKey,
          action: 'patch',
          code: 'TASK_MIRROR_PATCH_TARGET_MISSING',
          message: 'Task does not exist',
        });
        return;
      }
      const patch: { title?: string; order?: number } = {};
      if (action.patch.title !== undefined && current.title !== action.patch.title) {
        patch.title = action.patch.title;
      }
      if (action.patch.order !== undefined && current.order !== action.patch.order) {
        patch.order = action.patch.order;
      }
      if (Object.keys(patch).length === 0) {
        result.noops += 1;
        return;
      }
      try {
        await this.store.patchTask(current.id, patch, {
          expectedRevision: current.revision,
          actor: agentActor(plan.agentId),
        });
        result.patched += 1;
        return;
      } catch (error) {
        if (revisionConflict(error)) {
          continue;
        }
        throw error;
      }
    }
    this.conflict(result, {
      taskId: action.taskId,
      sourceKey: action.sourceKey,
      action: 'patch',
      code: 'TASK_MIRROR_PATCH_RETRY_EXHAUSTED',
      message: 'Revision changed repeatedly while applying native patch',
    });
  }

  private async transition(
    action: TaskMirrorTransitionAction,
    plan: TaskMirrorPlan,
    result: TaskMirrorMutationExecution
  ): Promise<void> {
    const target = action.to;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const current = this.task(action.taskId);
      if (!current) {
        this.conflict(result, {
          taskId: action.taskId,
          sourceKey: action.sourceKey,
          action: 'transition',
          code: 'TASK_MIRROR_TRANSITION_TARGET_MISSING',
          message: 'Task does not exist',
        });
        return;
      }
      if (current.status === target) {
        result.noops += 1;
        return;
      }
      if (terminal(current)) {
        this.conflict(result, {
          taskId: current.id,
          sourceKey: action.sourceKey,
          action: 'transition',
          code: 'TASK_MIRROR_TERMINAL_CONFLICT',
          message: `Task is already ${current.status}; native requested ${target}`,
        });
        return;
      }
      try {
        const options = {
          expectedRevision: current.revision,
          actor: agentActor(plan.agentId),
        };
        if (target === 'active') {
          if (current.status === 'pending') {
            await this.state.start(current.id, options);
            result.transitioned += 1;
            return;
          }
          if (current.status === 'blocked') {
            await this.state.resume(current.id, options);
            result.transitioned += 1;
            return;
          }
        }
        if (target === 'blocked') {
          if (current.status === 'pending') {
            await this.state.start(current.id, options);
            result.transitioned += 1;
            continue;
          }
          if (current.status === 'active') {
            await this.state.block(
              current.id,
              action.blockerReason ?? 'Native agent reported blocked work',
              action.nextAction,
              options
            );
            result.transitioned += 1;
            return;
          }
        }
        if (target === 'completed') {
          const conflictId = this.replicationConflict(current.id);
          if (conflictId) {
            this.conflict(result, {
              taskId: current.id,
              sourceKey: action.sourceKey,
              action: 'transition',
              code: 'TASK_REPLICATION_CONFLICT',
              message: `Task has unresolved replication conflict ${conflictId}`,
            });
            return;
          }
          const lease = current.activeLease;
          if (lease && lease.agentId !== plan.agentId) {
            this.conflict(result, {
              taskId: current.id,
              sourceKey: action.sourceKey,
              action: 'transition',
              code: 'TASK_COMPLETION_OWNER_MISMATCH',
              message: `Task lease belongs to ${lease.agentId}`,
            });
            return;
          }
          if (current.status === 'pending') {
            await this.state.start(current.id, options);
            result.transitioned += 1;
            continue;
          }
          if (current.status === 'blocked') {
            await this.state.resume(current.id, options);
            result.transitioned += 1;
            continue;
          }
          if (current.status === 'active') {
            await this.state.complete(current.id, options);
            result.transitioned += 1;
            return;
          }
        }
        if (target === 'cancelled') {
          await this.state.cancel(current.id, options);
          result.transitioned += 1;
          return;
        }
        this.conflict(result, {
          taskId: current.id,
          sourceKey: action.sourceKey,
          action: 'transition',
          code: 'TASK_MIRROR_TRANSITION_UNSUPPORTED',
          message: `Cannot reconcile ${current.status} -> ${target}`,
        });
        return;
      } catch (error) {
        if (revisionConflict(error)) {
          continue;
        }
        if (expectedConflict(error)) {
          const message = errorMessage(error);
          this.conflict(result, {
            taskId: current.id,
            sourceKey: action.sourceKey,
            action: 'transition',
            code: errorCode(message),
            message,
          });
          return;
        }
        throw error;
      }
    }
    this.conflict(result, {
      taskId: action.taskId,
      sourceKey: action.sourceKey,
      action: 'transition',
      code: 'TASK_MIRROR_TRANSITION_RETRY_EXHAUSTED',
      message: 'Revision changed repeatedly during lifecycle reconciliation',
    });
  }

  private async ensureClaim(
    action: Extract<TaskMirrorAction, { type: 'claim' }>,
    result: TaskMirrorMutationExecution
  ): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = this.task(action.taskId);
      if (!current) {
        this.conflict(result, {
          taskId: action.taskId,
          sourceKey: action.sourceKey,
          action: 'claim',
          code: 'TASK_MIRROR_CLAIM_TARGET_MISSING',
          message: 'Task does not exist',
        });
        return;
      }
      if (terminal(current)) {
        result.noops += 1;
        return;
      }
      const now = this.now();
      const lease = current.activeLease;
      if (lease && taskLeaseActiveAt(lease, now)) {
        if (lease.agentId === action.agentId) {
          result.noops += 1;
          return;
        }
        this.conflict(result, {
          taskId: current.id,
          sourceKey: action.sourceKey,
          action: 'claim',
          code: 'TASK_ALREADY_CLAIMED',
          message: `Task lease belongs to ${lease.agentId} until ${lease.expiresAt}`,
        });
        return;
      }
      const conflictId = this.replicationConflict(current.id);
      if (conflictId) {
        this.conflict(result, {
          taskId: current.id,
          sourceKey: action.sourceKey,
          action: 'claim',
          code: 'TASK_REPLICATION_CONFLICT',
          message: `Task has unresolved replication conflict ${conflictId}`,
        });
        return;
      }
      try {
        const claimed = await this.handoff.claim(current.id, action.agentId, {
          expectedRevision: current.revision,
          leaseMs: this.leaseMs,
          now,
        });
        if (claimed.acquired) {
          result.claimed += 1;
        } else {
          result.noops += 1;
        }
        return;
      } catch (error) {
        if (revisionConflict(error)) {
          continue;
        }
        if (expectedConflict(error)) {
          const message = errorMessage(error);
          this.conflict(result, {
            taskId: current.id,
            sourceKey: action.sourceKey,
            action: 'claim',
            code: errorCode(message),
            message,
          });
          return;
        }
        throw error;
      }
    }
    this.conflict(result, {
      taskId: action.taskId,
      sourceKey: action.sourceKey,
      action: 'claim',
      code: 'TASK_MIRROR_CLAIM_RETRY_EXHAUSTED',
      message: 'Revision changed repeatedly during automatic claim',
    });
  }

  private async ensureRelease(
    action: Extract<TaskMirrorAction, { type: 'release' }>,
    result: TaskMirrorMutationExecution
  ): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = this.task(action.taskId);
      if (!current) {
        result.noops += 1;
        return;
      }
      const lease = current.activeLease;
      if (!lease) {
        result.noops += 1;
        return;
      }
      if (lease.agentId !== action.agentId) {
        this.conflict(result, {
          taskId: current.id,
          sourceKey: action.sourceKey,
          action: 'release',
          code: 'TASK_MIRROR_RELEASE_OWNER_CONFLICT',
          message: `Task lease belongs to ${lease.agentId}`,
        });
        return;
      }
      try {
        await this.handoff.release(current.id, action.agentId, action.reason, {
          expectedRevision: current.revision,
          now: this.now(),
        });
        result.released += 1;
        return;
      } catch (error) {
        if (revisionConflict(error)) {
          continue;
        }
        if (errorMessage(error).startsWith('TASK_LEASE_NOT_FOUND')) {
          result.noops += 1;
          return;
        }
        throw error;
      }
    }
    this.conflict(result, {
      taskId: action.taskId,
      sourceKey: action.sourceKey,
      action: 'release',
      code: 'TASK_MIRROR_RELEASE_RETRY_EXHAUSTED',
      message: 'Revision changed repeatedly during automatic release',
    });
  }

  private async maintainCurrentLease(
    snapshot: AgentPlanSnapshot,
    result: TaskMirrorMutationExecution
  ): Promise<void> {
    if (!snapshot.currentSourceKey) {
      return;
    }
    const item = snapshot.items.find(
      (candidate) => candidate.sourceKey === snapshot.currentSourceKey
    );
    if (!item) {
      return;
    }
    const taskId = taskMirrorTaskId(snapshot, item);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = this.task(taskId);
      if (!current || terminal(current)) {
        return;
      }
      const now = this.now();
      const lease = current.activeLease;
      const conflictId = this.replicationConflict(current.id);
      if (conflictId) {
        this.conflict(result, {
          taskId: current.id,
          sourceKey: item.sourceKey,
          action: 'claim',
          code: 'TASK_REPLICATION_CONFLICT',
          message: `Task has unresolved replication conflict ${conflictId}`,
        });
        return;
      }
      if (!lease || !taskLeaseActiveAt(lease, now)) {
        try {
          const claimed = await this.handoff.claim(current.id, snapshot.agentId, {
            expectedRevision: current.revision,
            leaseMs: this.leaseMs,
            now,
          });
          if (claimed.acquired) {
            result.claimed += 1;
          } else {
            result.noops += 1;
          }
          return;
        } catch (error) {
          if (revisionConflict(error)) {
            continue;
          }
          if (expectedConflict(error)) {
            const message = errorMessage(error);
            this.conflict(result, {
              taskId: current.id,
              sourceKey: item.sourceKey,
              action: 'claim',
              code: errorCode(message),
              message,
            });
            return;
          }
          throw error;
        }
      }
      if (lease.agentId !== snapshot.agentId) {
        this.conflict(result, {
          taskId: current.id,
          sourceKey: item.sourceKey,
          action: 'claim',
          code: 'TASK_ALREADY_CLAIMED',
          message: `Current native item is owned by ${lease.agentId}`,
        });
        return;
      }
      const remaining = Date.parse(lease.expiresAt) - now;
      if (remaining > this.heartbeatThresholdMs) {
        return;
      }
      try {
        await this.handoff.heartbeat(current.id, snapshot.agentId, {
          expectedRevision: current.revision,
          leaseMs: this.leaseMs,
          now,
        });
        result.heartbeated += 1;
        return;
      } catch (error) {
        if (revisionConflict(error)) {
          continue;
        }
        if (expectedConflict(error)) {
          const message = errorMessage(error);
          this.conflict(result, {
            taskId: current.id,
            sourceKey: item.sourceKey,
            action: 'claim',
            code: errorCode(message),
            message,
          });
          return;
        }
        throw error;
      }
    }
  }

  async execute(
    snapshot: AgentPlanSnapshot,
    plan: TaskMirrorPlan
  ): Promise<TaskMirrorMutationExecution> {
    if (snapshot.projectId !== this.project.id || plan.projectId !== this.project.id) {
      throw new Error('TASK_MIRROR_MUTATION_PROJECT_MISMATCH');
    }
    if (
      snapshot.provider !== plan.provider ||
      snapshot.agentId !== plan.agentId ||
      snapshot.nativeSessionId !== plan.nativeSessionId ||
      snapshot.sourceEventId !== plan.sourceEventId
    ) {
      throw new Error('TASK_MIRROR_MUTATION_PLAN_MISMATCH');
    }
    const result: TaskMirrorMutationExecution = {
      projectId: plan.projectId,
      provider: plan.provider,
      agentId: plan.agentId,
      nativeSessionId: plan.nativeSessionId,
      sourceEventId: plan.sourceEventId,
      created: 0,
      patched: 0,
      transitioned: 0,
      claimed: 0,
      heartbeated: 0,
      released: 0,
      noops: 0,
      conflicts: [],
    };
    const goalTaskId = await this.ensureGoal(plan, result);
    for (const action of plan.actions) {
      if (action.type === 'create') {
        await this.ensureCreate(action, plan, goalTaskId, result);
      } else if (action.type === 'patch') {
        await this.ensurePatch(action, plan, result);
      } else if (action.type === 'transition') {
        await this.transition(action, plan, result);
      } else if (action.type === 'claim') {
        await this.ensureClaim(action, result);
      } else if (action.type === 'release') {
        await this.ensureRelease(action, result);
      } else {
        this.conflict(result, {
          taskId: action.taskId,
          sourceKey: action.sourceKey,
          action: 'conflict',
          code: 'TASK_MIRROR_PLAN_CONFLICT',
          message: action.reason,
        });
      }
    }
    await this.maintainCurrentLease(snapshot, result);
    return result;
  }
}
