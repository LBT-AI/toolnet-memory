import { randomUUID } from 'node:crypto';
import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import { computedTaskProgress, taskRecords, unresolvedTaskDependencies } from './projection.js';
import { taskLeaseActiveAt } from './handoff-projection.js';
import { TaskStore } from './store.js';
import type { TaskAgentLease, TaskHandoffRecord, TaskRecord } from './types.js';
export const DEFAULT_TASK_LEASE_MS = 15 * 60_000;
export const MIN_TASK_LEASE_MS = 30_000;
export const MAX_TASK_LEASE_MS = 24 * 60 * 60_000;
export interface TaskLeaseOptions {
  leaseMs?: number;
  expectedRevision?: number;
  now?: number;
}
export interface TaskClaimResult {
  task: TaskRecord;
  lease: TaskAgentLease;
  acquired: boolean;
  takeover: boolean;
}
export interface TaskAgentContinuity {
  rootTask: TaskRecord;
  recommendedTask?: TaskRecord;
  progress: {
    done: number;
    total: number;
    percent: number;
    source: 'children' | 'explicit';
  };
  currentlyOwnedTask?: TaskRecord;
  heldByOtherAgents: Array<{
    taskId: string;
    agentId: string;
    expiresAt: string;
  }>;
  previousAgentId?: string;
  lastHandoff?: TaskHandoffRecord;
  nextAction?: string;
  unresolvedDependencyIds: string[];
}
function requiredAgent(value: string): string {
  const normalized = sanitizeDurableText(value).trim();
  if (!normalized) {
    throw new Error('TASK_AGENT_ID_REQUIRED');
  }
  return normalized;
}
function leaseDuration(value: number | undefined): number {
  const leaseMs = value ?? DEFAULT_TASK_LEASE_MS;
  if (
    !Number.isSafeInteger(leaseMs) ||
    leaseMs < MIN_TASK_LEASE_MS ||
    leaseMs > MAX_TASK_LEASE_MS
  ) {
    throw new Error(
      ['TASK_LEASE_DURATION_INVALID', `min=${MIN_TASK_LEASE_MS}`, `max=${MAX_TASK_LEASE_MS}`].join(
        ' '
      )
    );
  }
  return leaseMs;
}
function operationTime(now: number | undefined): number {
  const value = now ?? Date.now();
  if (!Number.isFinite(value)) {
    throw new Error('TASK_OPERATION_TIME_INVALID');
  }
  return Math.trunc(value);
}
function iso(value: number): string {
  return new Date(value).toISOString();
}
function agentActor(agentId: string) {
  return {
    kind: 'agent' as const,
    id: agentId,
  };
}
function terminal(task: TaskRecord): boolean {
  return task.status === 'completed' || task.status === 'cancelled';
}
function candidateRank(task: TaskRecord): number {
  if (task.status === 'active') {
    return 0;
  }
  if (task.status === 'blocked') {
    return 1;
  }
  return 2;
}
export class TaskHandoffEngine {
  constructor(private readonly store: TaskStore) {}
  private task(taskId: string): TaskRecord {
    const current = this.store.getTask(taskId);
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${taskId}`);
    }
    return current;
  }
  async claim(
    taskId: string,
    agent: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskClaimResult> {
    const agentId = requiredAgent(agent);
    const current = this.task(taskId);
    if (terminal(current)) {
      throw new Error(`TASK_CLAIM_TERMINAL status=${current.status}`);
    }
    const now = operationTime(options.now);
    const existing = current.activeLease;
    if (existing && existing.agentId === agentId && taskLeaseActiveAt(existing, now)) {
      return {
        task: current,
        lease: existing,
        acquired: false,
        takeover: false,
      };
    }
    const duration = leaseDuration(options.leaseMs);
    const leaseId = randomUUID();
    const projection = await this.store.applyStateOperation(
      {
        type: 'task.agent.claim',
        taskId: current.id,
        expectedRevision: options.expectedRevision ?? current.revision,
        agentId,
        leaseId,
        leaseExpiresAt: iso(now + duration),
      },
      agentActor(agentId),
      iso(now)
    );
    const updated = projection.tasks[current.id];
    if (!updated?.activeLease) {
      throw new Error('TASK_CLAIM_PROJECTION_MISSING');
    }
    return {
      task: updated,
      lease: updated.activeLease,
      acquired: true,
      takeover: Boolean(existing && existing.agentId !== agentId),
    };
  }
  async heartbeat(
    taskId: string,
    agent: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskRecord> {
    const agentId = requiredAgent(agent);
    const current = this.task(taskId);
    const lease = current.activeLease;
    if (!lease) {
      throw new Error('TASK_LEASE_NOT_FOUND');
    }
    const now = operationTime(options.now);
    const duration = leaseDuration(options.leaseMs);
    const desired = Math.max(now + duration, Date.parse(lease.expiresAt) + 1);
    const projection = await this.store.applyStateOperation(
      {
        type: 'task.agent.heartbeat',
        taskId: current.id,
        expectedRevision: options.expectedRevision ?? current.revision,
        agentId,
        leaseId: lease.leaseId,
        leaseExpiresAt: iso(desired),
      },
      agentActor(agentId),
      iso(now)
    );
    return projection.tasks[current.id]!;
  }
  async release(
    taskId: string,
    agent: string,
    reason?: string,
    options: Pick<TaskLeaseOptions, 'expectedRevision' | 'now'> = {}
  ): Promise<TaskRecord> {
    const agentId = requiredAgent(agent);
    const current = this.task(taskId);
    const lease = current.activeLease;
    if (!lease) {
      throw new Error('TASK_LEASE_NOT_FOUND');
    }
    const now = operationTime(options.now);
    const projection = await this.store.applyStateOperation(
      {
        type: 'task.agent.release',
        taskId: current.id,
        expectedRevision: options.expectedRevision ?? current.revision,
        agentId,
        leaseId: lease.leaseId,
        ...(reason?.trim()
          ? {
              reason: sanitizeDurableText(reason).trim(),
            }
          : {}),
      },
      agentActor(agentId),
      iso(now)
    );
    return projection.tasks[current.id]!;
  }
  async handoff(
    taskId: string,
    fromAgent: string,
    toAgent: string,
    reason?: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskRecord> {
    const fromAgentId = requiredAgent(fromAgent);
    const toAgentId = requiredAgent(toAgent);
    if (fromAgentId === toAgentId) {
      throw new Error('TASK_HANDOFF_SAME_AGENT');
    }
    const current = this.task(taskId);
    const lease = current.activeLease;
    if (!lease) {
      throw new Error('TASK_LEASE_NOT_FOUND');
    }
    const now = operationTime(options.now);
    const duration = leaseDuration(options.leaseMs);
    const projection = await this.store.applyStateOperation(
      {
        type: 'task.agent.handoff',
        taskId: current.id,
        expectedRevision: options.expectedRevision ?? current.revision,
        fromAgentId,
        toAgentId,
        currentLeaseId: lease.leaseId,
        newLeaseId: randomUUID(),
        newLeaseExpiresAt: iso(now + duration),
        ...(reason?.trim()
          ? {
              reason: sanitizeDurableText(reason).trim(),
            }
          : {}),
      },
      agentActor(fromAgentId),
      iso(now)
    );
    return projection.tasks[current.id]!;
  }
  continuity(rootTaskId: string, agent: string, nowValue?: number): TaskAgentContinuity {
    const agentId = requiredAgent(agent);
    const now = operationTime(nowValue);
    const projection = this.store.projection();
    const root = projection.tasks[rootTaskId];
    if (!root) {
      throw new Error(`TASK_NOT_FOUND id=${rootTaskId}`);
    }
    const children = taskRecords(projection).filter((task) => task.parentTaskId === root.id);
    const scope = children.length > 0 ? children : [root];
    const currentlyOwned = scope.find(
      (task) => task.activeLease?.agentId === agentId && taskLeaseActiveAt(task.activeLease, now)
    );
    const available = scope
      .filter((task) => {
        if (terminal(task)) {
          return false;
        }
        if (
          task.status === 'pending' &&
          unresolvedTaskDependencies(projection.tasks, task).length > 0
        ) {
          return false;
        }
        if (
          task.activeLease &&
          task.activeLease.agentId !== agentId &&
          taskLeaseActiveAt(task.activeLease, now)
        ) {
          return false;
        }
        return true;
      })
      .sort(
        (left, right) =>
          candidateRank(left) - candidateRank(right) ||
          left.order - right.order ||
          left.createdAt.localeCompare(right.createdAt) ||
          left.id.localeCompare(right.id)
      );
    const recommended = currentlyOwned ?? available[0];
    const heldByOtherAgents = scope
      .filter(
        (task) =>
          Boolean(task.activeLease) &&
          task.activeLease?.agentId !== agentId &&
          taskLeaseActiveAt(task.activeLease, now)
      )
      .map((task) => ({
        taskId: task.id,
        agentId: task.activeLease!.agentId,
        expiresAt: task.activeLease!.expiresAt,
      }));
    const lastHandoff = recommended?.handoffHistory.at(-1);
    return {
      rootTask: root,
      ...(recommended
        ? {
            recommendedTask: recommended,
          }
        : {}),
      progress: computedTaskProgress(projection.tasks, root),
      ...(currentlyOwned
        ? {
            currentlyOwnedTask: currentlyOwned,
          }
        : {}),
      heldByOtherAgents,
      ...(recommended?.lastAgentId
        ? {
            previousAgentId: recommended.lastAgentId,
          }
        : {}),
      ...(lastHandoff
        ? {
            lastHandoff,
          }
        : {}),
      ...(recommended?.nextAction
        ? {
            nextAction: recommended.nextAction,
          }
        : {}),
      unresolvedDependencyIds: recommended
        ? unresolvedTaskDependencies(projection.tasks, recommended).map((task) => task.id)
        : [],
    };
  }
  async claimNext(
    rootTaskId: string,
    agent: string,
    options: TaskLeaseOptions = {}
  ): Promise<TaskClaimResult> {
    const agentId = requiredAgent(agent);
    const now = operationTime(options.now);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const continuity = this.continuity(rootTaskId, agentId, now);
      const candidate = continuity.recommendedTask;
      if (!candidate) {
        throw new Error('TASK_NO_RESUMABLE_WORK');
      }
      if (
        candidate.activeLease?.agentId === agentId &&
        taskLeaseActiveAt(candidate.activeLease, now)
      ) {
        return {
          task: candidate,
          lease: candidate.activeLease,
          acquired: false,
          takeover: false,
        };
      }
      try {
        return await this.claim(candidate.id, agentId, {
          ...options,
          expectedRevision: candidate.revision,
          now,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.startsWith('TASK_REVISION_CONFLICT') ||
          message.startsWith('TASK_ALREADY_CLAIMED')
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('TASK_CLAIM_RETRY_EXHAUSTED');
  }
}
