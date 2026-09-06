import { taskLeaseActiveAt } from './handoff-projection.js';
import { taskRecords, unresolvedTaskDependencies } from './projection.js';
import type { TaskReplicationConflict } from './replication/types.js';
import type { TaskProjection, TaskRecord } from './types.js';

export type TaskScheduleState =
  | 'ready'
  | 'owned'
  | 'waiting_dependencies'
  | 'blocked'
  | 'foreign_lease'
  | 'conflicted'
  | 'terminal';

export interface TaskScheduleEntry {
  task: TaskRecord;
  state: TaskScheduleState;
  unresolvedDependencyIds: string[];
  conflictIds: string[];
  leaseAgentId?: string;
}

export interface TaskDependencySchedule {
  rootTaskId?: string;
  agentId: string;
  evaluatedAt: string;
  entries: TaskScheduleEntry[];
  readyTasks: TaskScheduleEntry[];
  ownedTasks: TaskScheduleEntry[];
  waitingTasks: TaskScheduleEntry[];
  blockedTasks: TaskScheduleEntry[];
  foreignLeasedTasks: TaskScheduleEntry[];
  conflictedTasks: TaskScheduleEntry[];
  terminalTasks: TaskScheduleEntry[];
  /** All Tasks that may be independently claimed now. */
  parallelReadyTaskIds: string[];
  conflicts: TaskReplicationConflict[];
}

export interface TaskDependencyScheduleOptions {
  agentId: string;
  rootTaskId?: string;
  now?: number;
}

const PRIORITY_RANK: Record<TaskRecord['priority'], number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function normalizedAgentId(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('TASK_AGENT_ID_REQUIRED');
  }
  return normalized;
}

function normalizedNow(value: number | undefined): number {
  const current = value ?? Date.now();
  if (!Number.isFinite(current)) {
    throw new Error('TASK_OPERATION_TIME_INVALID');
  }
  return Math.trunc(current);
}

function compareTasks(left: TaskRecord, right: TaskRecord): number {
  return (
    PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority] ||
    left.order - right.order ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

function terminal(task: TaskRecord): boolean {
  return task.status === 'completed' || task.status === 'cancelled';
}

function unresolvedConflictIds(task: TaskRecord, conflicts: TaskReplicationConflict[]): string[] {
  const resolved = new Set((task.resolvedConflicts ?? []).map((item) => item.conflictId));
  return conflicts
    .filter((conflict) => conflict.taskId === task.id && !resolved.has(conflict.id))
    .map((conflict) => conflict.id)
    .sort();
}

function scopedTasks(projection: TaskProjection, rootTaskId?: string): TaskRecord[] {
  const all = taskRecords(projection);
  if (!rootTaskId) {
    return all;
  }
  const root = projection.tasks[rootTaskId];
  if (!root) {
    throw new Error(`TASK_NOT_FOUND id=${rootTaskId}`);
  }
  const output: TaskRecord[] = [];
  const queue = [root.id];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || seen.has(currentId)) {
      continue;
    }
    seen.add(currentId);
    const current = projection.tasks[currentId];
    if (!current) {
      continue;
    }
    output.push(current);
    const children = all.filter((task) => task.parentTaskId === current.id).sort(compareTasks);
    queue.push(...children.map((child) => child.id));
  }
  return output;
}

/** Do not schedule a container while it still owns descendant execution work. */
function executionCandidates(scope: TaskRecord[]): TaskRecord[] {
  if (scope.length <= 1) {
    return scope;
  }
  const ids = new Set(scope.map((task) => task.id));
  const containers = new Set<string>();
  for (const task of scope) {
    if (task.parentTaskId && ids.has(task.parentTaskId)) {
      containers.add(task.parentTaskId);
    }
  }
  return scope.filter((task) => !containers.has(task.id));
}

function classify(
  projection: TaskProjection,
  task: TaskRecord,
  agentId: string,
  now: number,
  conflicts: TaskReplicationConflict[]
): TaskScheduleEntry {
  const unresolvedDependencyIds = unresolvedTaskDependencies(projection.tasks, task).map(
    (dependency) => dependency.id
  );
  const conflictIds = unresolvedConflictIds(task, conflicts);
  const lease = task.activeLease;
  const leaseAgentId = lease?.agentId;
  const base = {
    task,
    unresolvedDependencyIds,
    conflictIds,
    ...(leaseAgentId ? { leaseAgentId } : {}),
  };

  if (terminal(task)) {
    return { ...base, state: 'terminal' };
  }
  if (conflictIds.length > 0) {
    return { ...base, state: 'conflicted' };
  }
  if (task.status === 'blocked' || task.blocker) {
    return { ...base, state: 'blocked' };
  }
  if (unresolvedDependencyIds.length > 0) {
    return { ...base, state: 'waiting_dependencies' };
  }
  if (lease && taskLeaseActiveAt(lease, now)) {
    return {
      ...base,
      state: lease.agentId === agentId ? 'owned' : 'foreign_lease',
      unresolvedDependencyIds: [],
    };
  }
  return { ...base, state: 'ready', unresolvedDependencyIds: [] };
}

function sortedEntries(entries: TaskScheduleEntry[]): TaskScheduleEntry[] {
  return [...entries].sort((left, right) => compareTasks(left.task, right.task));
}

function entriesWithState(
  entries: TaskScheduleEntry[],
  state: TaskScheduleState
): TaskScheduleEntry[] {
  return sortedEntries(entries.filter((entry) => entry.state === state));
}

export function buildTaskDependencySchedule(
  projection: TaskProjection,
  conflicts: TaskReplicationConflict[],
  options: TaskDependencyScheduleOptions
): TaskDependencySchedule {
  const agentId = normalizedAgentId(options.agentId);
  const now = normalizedNow(options.now);
  const candidates = executionCandidates(scopedTasks(projection, options.rootTaskId)).sort(
    compareTasks
  );
  const entries = candidates.map((task) => classify(projection, task, agentId, now, conflicts));
  const readyTasks = entriesWithState(entries, 'ready');
  const ownedTasks = entriesWithState(entries, 'owned');
  const waitingTasks = entriesWithState(entries, 'waiting_dependencies');
  const blockedTasks = entriesWithState(entries, 'blocked');
  const foreignLeasedTasks = entriesWithState(entries, 'foreign_lease');
  const conflictedTasks = entriesWithState(entries, 'conflicted');
  const terminalTasks = entriesWithState(entries, 'terminal');
  const relevantConflictIds = new Set(conflictedTasks.flatMap((entry) => entry.conflictIds));

  return {
    ...(options.rootTaskId ? { rootTaskId: options.rootTaskId } : {}),
    agentId,
    evaluatedAt: new Date(now).toISOString(),
    entries: sortedEntries(entries),
    readyTasks,
    ownedTasks,
    waitingTasks,
    blockedTasks,
    foreignLeasedTasks,
    conflictedTasks,
    terminalTasks,
    parallelReadyTaskIds: readyTasks.map((entry) => entry.task.id),
    conflicts: conflicts
      .filter((conflict) => relevantConflictIds.has(conflict.id))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}
