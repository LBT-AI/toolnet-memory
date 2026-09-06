import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import type { TaskDependencySchedule } from './dependency-scheduler.js';
import { TaskOrchestrationEngine, type TaskExecutionContext } from './orchestration-engine.js';
import type { TaskRecord } from './types.js';

export type TaskParallelAssignmentSource = 'owned' | 'planned' | 'claimed';

export interface TaskParallelAssignment {
  agentId: string;
  task: TaskRecord;
  source: TaskParallelAssignmentSource;
  context: TaskExecutionContext;
}

export interface TaskParallelFailure {
  agentId: string;
  taskId?: string;
  code: string;
  message: string;
}

export interface TaskParallelPlan {
  rootTaskId: string;
  agentIds: string[];
  assignments: TaskParallelAssignment[];
  unassignedAgentIds: string[];
  ambiguousAgentIds: string[];
  remainingReadyTaskIds: string[];
  conflictedTaskIds: string[];
}

export interface TaskParallelClaimResult extends TaskParallelPlan {
  failures: TaskParallelFailure[];
}

export interface TaskParallelExecutionOptions {
  now?: number;
  leaseMs?: number;
  maxClaimAttempts?: number;
}

function normalizedAgentId(value: string): string {
  const normalized = sanitizeDurableText(value).trim();
  if (!normalized) {
    throw new Error('TASK_AGENT_ID_REQUIRED');
  }
  return normalized;
}

function normalizedAgents(values: string[]): string[] {
  return [...new Set(values.map(normalizedAgentId))].sort();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): string {
  return errorMessage(error).trim().split(/\s+/u)[0] || 'TASK_PARALLEL_ASSIGNMENT_ERROR';
}

function retryableClaimRace(error: unknown): boolean {
  const message = errorMessage(error);
  return [
    'TASK_ALREADY_CLAIMED',
    'TASK_REVISION_CONFLICT',
    'TASK_REPLICATION_CONFLICT',
    'TASK_LEASE_',
    'TASK_CLAIM_',
  ].some((prefix) => message.startsWith(prefix));
}

function assignment(
  orchestration: TaskOrchestrationEngine,
  agentId: string,
  task: TaskRecord,
  source: TaskParallelAssignmentSource
): TaskParallelAssignment {
  return {
    agentId,
    task,
    source,
    context: orchestration.resumeContext(task.id),
  };
}

function conflictTaskIds(schedule: TaskDependencySchedule): string[] {
  return [...new Set(schedule.conflictedTasks.map((entry) => entry.task.id))].sort();
}

export class TaskParallelExecutionCoordinator {
  constructor(private readonly orchestration: TaskOrchestrationEngine) {}

  plan(
    rootTaskId: string,
    requestedAgents: string[],
    options: Pick<TaskParallelExecutionOptions, 'now'> = {}
  ): TaskParallelPlan {
    const agentIds = normalizedAgents(requestedAgents);
    if (agentIds.length === 0) {
      return {
        rootTaskId,
        agentIds: [],
        assignments: [],
        unassignedAgentIds: [],
        ambiguousAgentIds: [],
        remainingReadyTaskIds: [],
        conflictedTaskIds: [],
      };
    }

    const assignments: TaskParallelAssignment[] = [];
    const ambiguousAgentIds: string[] = [];
    const freeAgents: string[] = [];
    const ownedTaskIds = new Set<string>();

    for (const agentId of agentIds) {
      const schedule = this.orchestration.scheduleTasks(rootTaskId, agentId, options.now);
      if (schedule.ownedTasks.length > 1) {
        ambiguousAgentIds.push(agentId);
        continue;
      }
      const owned = schedule.ownedTasks[0]?.task;
      if (!owned) {
        freeAgents.push(agentId);
        continue;
      }
      ownedTaskIds.add(owned.id);
      assignments.push(assignment(this.orchestration, agentId, owned, 'owned'));
    }

    const referenceAgent = freeAgents[0] ?? agentIds[0];
    const referenceSchedule = this.orchestration.scheduleTasks(
      rootTaskId,
      referenceAgent,
      options.now
    );
    const ready = referenceSchedule.readyTasks
      .map((entry) => entry.task)
      .filter((task) => !ownedTaskIds.has(task.id));
    const plannedCount = Math.min(freeAgents.length, ready.length);
    for (let index = 0; index < plannedCount; index += 1) {
      const agentId = freeAgents[index];
      const task = ready[index];
      if (agentId && task) {
        assignments.push(assignment(this.orchestration, agentId, task, 'planned'));
      }
    }

    const assignedAgents = new Set(assignments.map((item) => item.agentId));
    const assignedTasks = new Set(assignments.map((item) => item.task.id));
    return {
      rootTaskId,
      agentIds,
      assignments: assignments.sort((left, right) => left.agentId.localeCompare(right.agentId)),
      unassignedAgentIds: freeAgents.filter((agentId) => !assignedAgents.has(agentId)).sort(),
      ambiguousAgentIds: ambiguousAgentIds.sort(),
      remainingReadyTaskIds: ready
        .filter((task) => !assignedTasks.has(task.id))
        .map((task) => task.id),
      conflictedTaskIds: conflictTaskIds(referenceSchedule),
    };
  }

  async claimReady(
    rootTaskId: string,
    requestedAgents: string[],
    options: TaskParallelExecutionOptions = {}
  ): Promise<TaskParallelClaimResult> {
    const agentIds = normalizedAgents(requestedAgents);
    const assignments: TaskParallelAssignment[] = [];
    const failures: TaskParallelFailure[] = [];
    const ambiguousAgentIds: string[] = [];
    const unassignedAgentIds: string[] = [];
    const maxAttempts = Math.max(1, Math.min(8, Math.trunc(options.maxClaimAttempts ?? 4)));

    for (const agentId of agentIds) {
      let settled = false;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const schedule = this.orchestration.scheduleTasks(rootTaskId, agentId, options.now);
        if (schedule.ownedTasks.length > 1) {
          ambiguousAgentIds.push(agentId);
          settled = true;
          break;
        }
        const owned = schedule.ownedTasks[0]?.task;
        if (owned) {
          assignments.push(assignment(this.orchestration, agentId, owned, 'owned'));
          settled = true;
          break;
        }
        const candidate = schedule.readyTasks[0]?.task;
        if (!candidate) {
          unassignedAgentIds.push(agentId);
          settled = true;
          break;
        }
        try {
          const claim = await this.orchestration.claim(candidate.id, agentId, {
            ...(options.now !== undefined ? { now: options.now } : {}),
            ...(options.leaseMs !== undefined ? { leaseMs: options.leaseMs } : {}),
            expectedRevision: candidate.revision,
          });
          assignments.push(assignment(this.orchestration, agentId, claim.task, 'claimed'));
          settled = true;
          break;
        } catch (error) {
          if (retryableClaimRace(error) && attempt + 1 < maxAttempts) {
            continue;
          }
          failures.push({
            agentId,
            taskId: candidate.id,
            code: errorCode(error),
            message: errorMessage(error),
          });
          settled = true;
          break;
        }
      }
      if (!settled) {
        unassignedAgentIds.push(agentId);
      }
    }

    const referenceAgent = agentIds[0];
    const finalSchedule = referenceAgent
      ? this.orchestration.scheduleTasks(rootTaskId, referenceAgent, options.now)
      : undefined;
    const assignedAgents = new Set(assignments.map((assignment) => assignment.agentId));
    return {
      rootTaskId,
      agentIds,
      assignments: assignments.sort((left, right) => left.agentId.localeCompare(right.agentId)),
      unassignedAgentIds: [
        ...new Set([
          ...unassignedAgentIds,
          ...agentIds.filter(
            (agentId) => !assignedAgents.has(agentId) && !ambiguousAgentIds.includes(agentId)
          ),
        ]),
      ].sort(),
      ambiguousAgentIds: [...new Set(ambiguousAgentIds)].sort(),
      remainingReadyTaskIds: finalSchedule
        ? finalSchedule.readyTasks.map((entry) => entry.task.id)
        : [],
      conflictedTaskIds: finalSchedule ? conflictTaskIds(finalSchedule) : [],
      failures,
    };
  }
}
