import {
  computedTaskProgress,
  taskRecords,
  unresolvedTaskDependencies,
} from '../tasks/projection.js';
import { taskLeaseActiveAt } from '../tasks/handoff-projection.js';
import type { TaskComputedProgress, TaskProjection, TaskRecord } from '../tasks/types.js';
export const TASK_PANEL_MAX_ITEMS = 500;
export interface TaskPanelProject {
  id: string;
  name: string;
  remote?: string;
}
export interface TaskPanelLease {
  agentId: string;
  expiresAt: string;
}
export interface TaskPanelItem {
  id: string;
  kind: TaskRecord['kind'];
  title: string;
  status: TaskRecord['status'];
  priority: TaskRecord['priority'];
  order: number;
  progress: TaskComputedProgress;
  childCount: number;
  unresolvedDependencyIds: string[];
  activeLease?: TaskPanelLease;
  blockerReason?: string;
  nextAction?: string;
  children: TaskPanelItem[];
}
export interface TaskPanelRootSummary {
  id: string;
  title: string;
  status: TaskRecord['status'];
  progress: TaskComputedProgress;
}
export interface TaskPanelCounts {
  total: number;
  pending: number;
  active: number;
  blocked: number;
  completed: number;
  cancelled: number;
}
export interface TaskPanelView {
  version: 1;
  project: TaskPanelProject;
  refreshedAt: string;
  empty: boolean;
  roots: TaskPanelRootSummary[];
  selectedRootTaskId?: string;
  selectedRoot?: TaskPanelItem;
  currentTask?: TaskPanelItem;
  counts: TaskPanelCounts;
  activeLeaseCount: number;
  truncated: boolean;
  hiddenItemCount: number;
}
function sortedTasks(projection: TaskProjection): TaskRecord[] {
  return taskRecords(projection);
}
function childrenOf(projection: TaskProjection, taskId: string): TaskRecord[] {
  return sortedTasks(projection).filter((task) => task.parentTaskId === taskId);
}
function rootForTask(projection: TaskProjection, task: TaskRecord): TaskRecord {
  let current = task;
  const seen = new Set<string>();
  while (current.parentTaskId) {
    if (seen.has(current.id)) {
      break;
    }
    seen.add(current.id);
    const parent = projection.tasks[current.parentTaskId];
    if (!parent) {
      break;
    }
    current = parent;
  }
  return current;
}
function subtreeTasks(projection: TaskProjection, rootTaskId: string): TaskRecord[] {
  const output: TaskRecord[] = [];
  const queue = [rootTaskId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const task = projection.tasks[id];
    if (!task) {
      continue;
    }
    output.push(task);
    for (const child of childrenOf(projection, task.id)) {
      queue.push(child.id);
    }
  }
  return output;
}
function currentRank(projection: TaskProjection, task: TaskRecord, now: number): number {
  if (task.status === 'active' && taskLeaseActiveAt(task.activeLease, now)) {
    return 0;
  }
  if (task.status === 'active') {
    return 1;
  }
  if (task.status === 'blocked') {
    return 2;
  }
  if (
    task.status === 'pending' &&
    unresolvedTaskDependencies(projection.tasks, task).length === 0
  ) {
    return 3;
  }
  if (task.status === 'pending') {
    return 4;
  }
  if (task.status === 'completed') {
    return 5;
  }
  return 6;
}
function rootRank(projection: TaskProjection, root: TaskRecord, now: number): number {
  const subtree = subtreeTasks(projection, root.id);
  let best = currentRank(projection, root, now);
  for (const task of subtree) {
    best = Math.min(best, currentRank(projection, task, now));
  }
  return best;
}
function chooseRoot(
  projection: TaskProjection,
  requestedRootTaskId: string | undefined,
  now: number
): TaskRecord | undefined {
  if (requestedRootTaskId) {
    const requested = projection.tasks[requestedRootTaskId];
    if (requested) {
      return rootForTask(projection, requested);
    }
  }
  const roots = sortedTasks(projection).filter((task) => !task.parentTaskId);
  return roots.sort(
    (left, right) =>
      rootRank(projection, left, now) - rootRank(projection, right, now) ||
      left.order - right.order ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  )[0];
}
function activeLease(task: TaskRecord, now: number): TaskPanelLease | undefined {
  if (!taskLeaseActiveAt(task.activeLease, now)) {
    return undefined;
  }
  return {
    agentId: task.activeLease!.agentId,
    expiresAt: task.activeLease!.expiresAt,
  };
}
interface BuildTreeContext {
  projection: TaskProjection;
  now: number;
  emitted: number;
  truncated: boolean;
}
function panelItem(context: BuildTreeContext, task: TaskRecord): TaskPanelItem {
  context.emitted += 1;
  const children = childrenOf(context.projection, task.id);
  const output: TaskPanelItem = {
    id: task.id,
    kind: task.kind,
    title: task.title,
    status: task.status,
    priority: task.priority,
    order: task.order,
    progress: computedTaskProgress(context.projection.tasks, task),
    childCount: children.length,
    unresolvedDependencyIds: unresolvedTaskDependencies(context.projection.tasks, task).map(
      (dependency) => dependency.id
    ),
    children: [],
  };
  const lease = activeLease(task, context.now);
  if (lease) {
    output.activeLease = lease;
  }
  if (task.blocker?.reason) {
    output.blockerReason = task.blocker.reason;
  }
  if (task.nextAction) {
    output.nextAction = task.nextAction;
  }
  for (const child of children) {
    if (context.emitted >= TASK_PANEL_MAX_ITEMS) {
      context.truncated = true;
      break;
    }
    output.children.push(panelItem(context, child));
  }
  return output;
}
function selectCurrentTask(projection: TaskProjection, root: TaskRecord, now: number): TaskRecord {
  const subtree = subtreeTasks(projection, root.id);
  const descendants = subtree.filter((task) => task.id !== root.id);
  const candidates = descendants.length > 0 ? descendants : [root];
  return (
    candidates.sort(
      (left, right) =>
        currentRank(projection, left, now) - currentRank(projection, right, now) ||
        left.order - right.order ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id)
    )[0] ?? root
  );
}
function emptyCounts(): TaskPanelCounts {
  return {
    total: 0,
    pending: 0,
    active: 0,
    blocked: 0,
    completed: 0,
    cancelled: 0,
  };
}
function countsFor(tasks: TaskRecord[]): TaskPanelCounts {
  const counts = emptyCounts();
  for (const task of tasks) {
    counts.total += 1;
    counts[task.status] += 1;
  }
  return counts;
}
export function buildTaskPanelView(
  project: TaskPanelProject,
  projection: TaskProjection,
  requestedRootTaskId?: string,
  now = Date.now()
): TaskPanelView {
  const allTasks = sortedTasks(projection);
  const roots = allTasks
    .filter((task) => !task.parentTaskId)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id)
    );
  const selectedRoot = chooseRoot(projection, requestedRootTaskId, now);
  const rootSummaries: TaskPanelRootSummary[] = roots.map((root) => ({
    id: root.id,
    title: root.title,
    status: root.status,
    progress: computedTaskProgress(projection.tasks, root),
  }));
  if (!selectedRoot) {
    return {
      version: 1,
      project: {
        id: project.id,
        name: project.name,
        ...(project.remote
          ? {
              remote: project.remote,
            }
          : {}),
      },
      refreshedAt: new Date(now).toISOString(),
      empty: true,
      roots: rootSummaries,
      counts: emptyCounts(),
      activeLeaseCount: 0,
      truncated: false,
      hiddenItemCount: 0,
    };
  }
  const subtree = subtreeTasks(projection, selectedRoot.id);
  const current = selectCurrentTask(projection, selectedRoot, now);
  const treeContext: BuildTreeContext = {
    projection,
    now,
    emitted: 0,
    truncated: false,
  };
  const selectedRootView = panelItem(treeContext, selectedRoot);
  const currentContext: BuildTreeContext = {
    projection,
    now,
    emitted: 0,
    truncated: false,
  };
  const currentView = panelItem(currentContext, current);
  currentView.children = [];
  const activeLeaseCount = subtree.filter((task) =>
    taskLeaseActiveAt(task.activeLease, now)
  ).length;
  return {
    version: 1,
    project: {
      id: project.id,
      name: project.name,
      ...(project.remote
        ? {
            remote: project.remote,
          }
        : {}),
    },
    refreshedAt: new Date(now).toISOString(),
    empty: false,
    roots: rootSummaries,
    selectedRootTaskId: selectedRoot.id,
    selectedRoot: selectedRootView,
    currentTask: currentView,
    counts: countsFor(subtree),
    activeLeaseCount,
    truncated: treeContext.truncated,
    hiddenItemCount: Math.max(0, subtree.length - treeContext.emitted),
  };
}
