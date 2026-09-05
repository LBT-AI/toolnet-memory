import type { ProjectManifest } from '../core/types.js';
import type { SessionIdentity } from '../session/types.js';
import { TaskMirrorBindingStore } from '../tasks/mirror-binding-store.js';
import { taskMirrorTaskId } from '../tasks/mirror-identity.js';
import type {
  TaskMirrorBindingProjection,
  TaskMirrorBindingRecord,
} from '../tasks/mirror-binding-types.js';
import type { TaskProjection, TaskRecord, TaskStatus } from '../tasks/types.js';
import { TaskStore } from '../tasks/store.js';
import { loadLocalWorkState, writeLocalWorkState } from './local-work-state.js';
import { writeStableWorkStateToCurrent } from './work-state-current.js';
import { writeSessionOrigin } from './session-origin.js';
import type { WorkItem, WorkObservation, WorkState } from './types.js';

function workStatus(status: TaskStatus): WorkItem['status'] {
  if (status === 'active') {
    return 'in_progress';
  }
  return status;
}

function taskSnapshotId(projectId: string, binding: TaskMirrorBindingRecord): string {
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

function toWorkItem(task: TaskRecord, binding: TaskMirrorBindingRecord): WorkItem {
  return {
    id: task.id,
    title: task.title,
    status: workStatus(task.status),
    order: task.order,
    confidence: 1,
    updatedAt: task.updatedAt,
    updatedBy: {
      agent: binding.agentId,
      nativeSessionId: binding.nativeSessionId,
      eventId: binding.lastSourceEventId,
    },
  };
}
function latestScope(
  projection: TaskMirrorBindingProjection,
  identity?: Pick<SessionIdentity, 'agent' | 'nativeSessionId'>
): TaskMirrorBindingProjection['scopes'][string] | undefined {
  const scopes = Object.values(projection.scopes);
  const matching = identity
    ? scopes.filter((scope) =>
        scope.bindings.some(
          (binding) =>
            binding.provider === identity.agent &&
            binding.nativeSessionId === identity.nativeSessionId
        )
      )
    : scopes;
  if (identity && matching.length === 0) {
    return undefined;
  }
  if (!identity && matching.length !== 1) {
    return undefined;
  }
  return matching.sort(
    (left, right) =>
      right.lastObservedAt.localeCompare(left.lastObservedAt) ||
      right.scopeKey.localeCompare(left.scopeKey)
  )[0];
}

function boundTasks(
  projectId: string,
  scope: NonNullable<ReturnType<typeof latestScope>>,
  projection: TaskProjection
): Array<{ task: TaskRecord; binding: TaskMirrorBindingRecord; item: WorkItem }> {
  const output: Array<{
    task: TaskRecord;
    binding: TaskMirrorBindingRecord;
    item: WorkItem;
  }> = [];
  const seen = new Set<string>();
  for (const binding of scope.bindings) {
    const taskId = taskSnapshotId(projectId, binding);
    const task = projection.tasks[taskId];
    if (!task || seen.has(task.id)) {
      continue;
    }
    seen.add(task.id);
    output.push({
      task,
      binding,
      item: toWorkItem(task, binding),
    });
  }
  return output.sort(
    (left, right) => left.task.order - right.task.order || left.task.id.localeCompare(right.task.id)
  );
}

function currentBoundTask(
  scope: NonNullable<ReturnType<typeof latestScope>>,
  tasks: ReturnType<typeof boundTasks>
): ReturnType<typeof boundTasks>[number] | undefined {
  const currentBinding = scope.currentCanonicalSourceKey
    ? scope.bindings.find(
        (binding) => binding.canonicalSourceKey === scope.currentCanonicalSourceKey
      )
    : undefined;
  if (currentBinding) {
    const exact = tasks.find((item) => item.binding.bindingId === currentBinding.bindingId);
    if (exact && !['completed', 'cancelled'].includes(exact.task.status)) {
      return exact;
    }
  }
  return (
    tasks.find((item) => item.task.status === 'active') ??
    tasks.find((item) => item.task.status === 'blocked') ??
    tasks.find((item) => item.task.status === 'pending') ??
    tasks.find((item) => item.task.status === 'completed') ??
    tasks[0]
  );
}

function taskTests(task: TaskRecord): string[] {
  return task.tests.map((test) => {
    const suffix = test.detail ? `: ${test.detail}` : '';
    return `[${test.outcome}] ${test.name}${suffix}`;
  });
}

function emptyWorkState(project: Pick<ProjectManifest, 'id' | 'name'>): WorkState {
  const now = new Date().toISOString();
  return {
    version: 1,
    projectId: project.id,
    projectName: project.name,
    phases: [],
    tasks: [],
    decisions: [],
    blockers: [],
    warnings: [],
    nextActions: [],
    filesTouched: [],
    tests: [],
    progress: {
      phasesTotal: 0,
      phasesCompleted: 0,
      tasksTotal: 0,
      tasksCompleted: 0,
      blocked: 0,
    },
    updatedAt: now,
  };
}

/**
 * Projects authoritative Persistent Task execution state into the legacy
 * WorkState shape without expanding WorkState into a second TaskRecord.
 *
 * No relevant binding means the old WorkObservation projection is returned
 * unchanged. This is the compatibility boundary for legacy/unbound sessions.
 */
export function projectWorkStateWithTasks(input: {
  project: Pick<ProjectManifest, 'id'>;
  identity?: SessionIdentity;
  observations: WorkObservation[];
  previousWorkState: WorkState;
  taskProjection: TaskProjection;
  bindingProjection: TaskMirrorBindingProjection;
}): WorkState {
  const scope = latestScope(input.bindingProjection, input.identity);
  if (!scope) {
    return input.previousWorkState;
  }
  const projected = boundTasks(input.project.id, scope, input.taskProjection);
  if (projected.length === 0) {
    return input.previousWorkState;
  }
  const current = currentBoundTask(scope, projected);
  if (!current) {
    return input.previousWorkState;
  }
  const authoritativeTasks = projected.map((item) => item.item);
  const completed = projected.filter((item) => item.task.status === 'completed').length;
  const blocked = projected.filter((item) => item.task.status === 'blocked').length;
  const files = projected.flatMap((item) => item.task.filesTouched);
  const tests = projected.flatMap((item) => taskTests(item.task));
  const blocker =
    current.task.blocker?.reason ??
    (current.task.status === 'blocked' ? current.task.title : undefined);
  const nextActions = current.task.nextAction ? [current.task.nextAction] : [];
  const updatedAt =
    [input.previousWorkState.updatedAt, ...projected.map((item) => item.task.updatedAt)]
      .sort()
      .at(-1) ?? input.previousWorkState.updatedAt;
  return {
    ...input.previousWorkState,
    tasks: authoritativeTasks,
    currentTask: current.item,
    blockers: blocker ? [blocker] : [],
    nextActions,
    filesTouched: [...new Set(files)],
    activeFiles: [...new Set(files)].slice(-5),
    tests: [...new Set(tests)],
    progress: {
      ...input.previousWorkState.progress,
      tasksTotal: projected.length,
      tasksCompleted: completed,
      blocked,
    },
    lastSession: {
      agent: current.binding.agentId,
      nativeSessionId: current.binding.nativeSessionId,
      sessionKey: input.identity?.sessionKey ?? `task:${current.task.id}`,
      updatedAt,
    },
    updatedAt,
  };
}

export function projectLocalWorkStateWithTasks(
  project: ProjectManifest,
  identity?: SessionIdentity,
  observations: WorkObservation[] = [],
  taskProjection = new TaskStore(project).projection(),
  bindingProjection = new TaskMirrorBindingStore(project).projection()
): WorkState | null {
  const previous = loadLocalWorkState(project);
  const current = previous ?? emptyWorkState(project);
  const next = projectWorkStateWithTasks({
    project,
    identity,
    observations,
    previousWorkState: current,
    taskProjection,
    bindingProjection,
  });
  if (next === current) {
    return previous;
  }
  const durable = writeLocalWorkState(project, next);
  writeStableWorkStateToCurrent(project, durable);
  if (identity) {
    writeSessionOrigin(project, {
      agent: identity.agent,
      nativeSessionId: identity.nativeSessionId,
      observations,
      workState: next,
    });
  }
  return next;
}

export function refreshLocalTaskCompatibility(
  project: ProjectManifest,
  identity: SessionIdentity,
  observations: WorkObservation[] = []
): WorkState | null {
  return projectLocalWorkStateWithTasks(project, identity, observations);
}
