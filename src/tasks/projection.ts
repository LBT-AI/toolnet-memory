import type {
  TaskActor,
  TaskComputedProgress,
  TaskCompletionSnapshot,
  TaskEvidenceKind,
  TaskOperation,
  TaskPatch,
  TaskPriority,
  TaskProjection,
  TaskRecord,
  TaskStatus,
  TaskTestOutcome,
} from './types.js';
import { taskPayloadHash } from './operation-log.js';
import { completionDigest } from './completion-snapshot.js';
import { applyTaskAgentOperation, isTaskAgentOperationPayload } from './handoff-projection.js';
const PRIORITIES = new Set<TaskPriority>(['critical', 'high', 'normal', 'low']);
const STATUSES = new Set<TaskStatus>(['pending', 'active', 'blocked', 'completed', 'cancelled']);
const EVIDENCE_KINDS = new Set<TaskEvidenceKind>([
  'note',
  'file',
  'test',
  'commit',
  'artifact',
  'review',
]);
const TEST_OUTCOMES = new Set<TaskTestOutcome>(['pass', 'fail', 'skip']);
const COMPLETION_MAX_SUMMARY = 4_000;
const COMPLETION_MAX_ENTRIES = 256;
const COMPLETION_MAX_ENTRY_TEXT = 1_000;
const COMPLETION_MAX_FILES = 256;
const COMPLETION_MAX_FILE_TEXT = 500;
const COMMIT_SHA = /^[0-9a-f]{7,64}$/iu;
function copyActor(actor: TaskActor): TaskActor {
  return {
    kind: actor.kind,
    ...(actor.id
      ? {
          id: actor.id,
        }
      : {}),
  };
}
function requiredText(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(code);
  }
  return normalized;
}
function validOrder(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('TASK_ORDER_INVALID');
  }
}
function validProgress(completed: number, total: number): void {
  if (
    !Number.isSafeInteger(completed) ||
    !Number.isSafeInteger(total) ||
    completed < 0 ||
    total < 0 ||
    completed > total
  ) {
    throw new Error('TASK_PROGRESS_INVALID');
  }
}
function validRevision(expected: number | undefined, actual: number): void {
  if (expected === undefined) {
    return;
  }
  if (expected !== actual) {
    throw new Error(
      ['TASK_REVISION_CONFLICT', `expected=${expected}`, `actual=${actual}`].join(' ')
    );
  }
}
function validatePatch(patch: TaskPatch): void {
  if (patch.title !== undefined && !patch.title.trim()) {
    throw new Error('TASK_TITLE_REQUIRED');
  }
  if (patch.priority !== undefined && !PRIORITIES.has(patch.priority)) {
    throw new Error('TASK_PRIORITY_INVALID');
  }
  if (patch.order !== undefined) {
    validOrder(patch.order);
  }
}
function updated(
  task: TaskRecord,
  operation: TaskOperation
): Pick<TaskRecord, 'updatedAt' | 'updatedBy' | 'revision'> {
  return {
    updatedAt: operation.occurredAt,
    updatedBy: copyActor(operation.actor),
    revision: task.revision + 1,
  };
}
function applyPatch(task: TaskRecord, patch: TaskPatch, operation: TaskOperation): TaskRecord {
  validatePatch(patch);
  const next: TaskRecord = {
    ...task,
    ...(patch.title !== undefined
      ? {
          title: patch.title,
        }
      : {}),
    ...(patch.priority !== undefined
      ? {
          priority: patch.priority,
        }
      : {}),
    ...(patch.labels !== undefined
      ? {
          labels: [...patch.labels],
        }
      : {}),
    ...(patch.order !== undefined
      ? {
          order: patch.order,
        }
      : {}),
    ...updated(task, operation),
  };
  if (patch.description === null) {
    delete next.description;
  } else if (patch.description !== undefined) {
    next.description = patch.description;
  }
  if (patch.assignedAgentId === null) {
    delete next.assignedAgentId;
  } else if (patch.assignedAgentId !== undefined) {
    next.assignedAgentId = patch.assignedAgentId;
  }
  return next;
}
function completionText(value: unknown, max: number, code: string): string {
  if (typeof value !== 'string') {
    throw new Error(code);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(code);
  }
  return normalized.slice(0, max);
}
function completionList(value: unknown, maxEntries: number, maxText: number): string[] {
  if (!Array.isArray(value)) {
    throw new Error('TASK_COMPLETION_LIST_INVALID');
  }
  return value
    .slice(0, maxEntries)
    .map((item) => completionText(item, maxText, 'TASK_COMPLETION_ENTRY_INVALID'));
}
function completionTests(value: unknown): TaskCompletionSnapshot['tests'] {
  if (!Array.isArray(value)) {
    throw new Error('TASK_COMPLETION_TESTS_INVALID');
  }
  return value.slice(0, COMPLETION_MAX_ENTRIES).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('TASK_COMPLETION_TEST_INVALID');
    }
    const test = item as Record<string, unknown>;
    const outcome = test.outcome;
    if (typeof outcome !== 'string' || !TEST_OUTCOMES.has(outcome as TaskTestOutcome)) {
      throw new Error('TASK_COMPLETION_TEST_OUTCOME_INVALID');
    }
    return {
      name: completionText(
        test.name,
        COMPLETION_MAX_ENTRY_TEXT,
        'TASK_COMPLETION_TEST_NAME_INVALID'
      ),
      outcome: outcome as TaskTestOutcome,
      ...(test.detail !== undefined
        ? {
            detail: completionText(
              test.detail,
              COMPLETION_MAX_ENTRY_TEXT,
              'TASK_COMPLETION_TEST_DETAIL_INVALID'
            ),
          }
        : {}),
    };
  });
}
function completionSource(value: unknown): TaskCompletionSnapshot['source'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('TASK_COMPLETION_SOURCE_INVALID');
  }
  const source = value as Record<string, unknown>;
  return {
    provider: completionText(source.provider, 100, 'TASK_COMPLETION_SOURCE_INVALID'),
    nativeSessionId: completionText(source.nativeSessionId, 300, 'TASK_COMPLETION_SOURCE_INVALID'),
    sourceEventId: completionText(source.sourceEventId, 300, 'TASK_COMPLETION_SOURCE_INVALID'),
    ...(source.turnId !== undefined
      ? {
          turnId: completionText(source.turnId, 300, 'TASK_COMPLETION_SOURCE_INVALID'),
        }
      : {}),
  };
}
function completionSnapshot(
  payload: Extract<TaskOperation['payload'], { type: 'task.completion.recorded' }>,
  operation: TaskOperation,
  current: TaskRecord
): TaskCompletionSnapshot {
  const completion = payload.completion;
  const id = completionText(completion.id, 100, 'TASK_COMPLETION_ID_INVALID');
  const summary = completionText(
    completion.summary,
    COMPLETION_MAX_SUMMARY,
    'TASK_COMPLETION_SUMMARY_REQUIRED'
  );
  const changes = completionList(completion.changes, 32, COMPLETION_MAX_ENTRY_TEXT);
  const decisions = completionList(completion.decisions, 16, COMPLETION_MAX_ENTRY_TEXT);
  const verification = completionList(completion.verification, 32, COMPLETION_MAX_ENTRY_TEXT);
  const files = completionList(completion.files, COMPLETION_MAX_FILES, COMPLETION_MAX_FILE_TEXT);
  const tests = completionTests(completion.tests);
  const commitSha = completion.commitSha;
  if (commitSha !== undefined && (typeof commitSha !== 'string' || !COMMIT_SHA.test(commitSha))) {
    throw new Error('TASK_COMPLETION_COMMIT_INVALID');
  }
  const digest = completionText(completion.digest, 64, 'TASK_COMPLETION_DIGEST_INVALID');
  const snapshot: TaskCompletionSnapshot = {
    id,
    summary,
    changes,
    decisions,
    verification,
    files,
    tests,
    ...(commitSha ? { commitSha: commitSha.toLowerCase() } : {}),
    source: completionSource(completion.source),
    capturedAt: operation.occurredAt,
    digest,
  };
  const expectedDigest = completionDigest({
    id: snapshot.id,
    summary: snapshot.summary,
    changes: snapshot.changes,
    decisions: snapshot.decisions,
    verification: snapshot.verification,
    files: snapshot.files,
    tests: snapshot.tests,
    ...(snapshot.commitSha ? { commitSha: snapshot.commitSha } : {}),
    source: snapshot.source,
  });
  if (expectedDigest !== digest) {
    throw new Error('TASK_COMPLETION_DIGEST_MISMATCH');
  }
  if (current.completion) {
    if (current.completion.digest === digest) {
      return current.completion;
    }
    throw new Error('TASK_COMPLETION_ALREADY_RECORDED');
  }
  return snapshot;
}
function directChildren(tasks: Record<string, TaskRecord>, taskId: string): TaskRecord[] {
  return Object.values(tasks).filter((task) => task.parentTaskId === taskId);
}
function dependencyPathExists(
  tasks: Record<string, TaskRecord>,
  fromTaskId: string,
  targetTaskId: string,
  visited = new Set<string>()
): boolean {
  if (fromTaskId === targetTaskId) {
    return true;
  }
  if (visited.has(fromTaskId)) {
    return false;
  }
  visited.add(fromTaskId);
  const task = tasks[fromTaskId];
  if (!task) {
    return false;
  }
  for (const dependency of task.dependencies) {
    if (dependencyPathExists(tasks, dependency, targetTaskId, visited)) {
      return true;
    }
  }
  return false;
}
export function unresolvedTaskDependencies(
  tasks: Record<string, TaskRecord>,
  task: TaskRecord
): TaskRecord[] {
  return task.dependencies
    .map((id) => tasks[id])
    .filter(
      (dependency): dependency is TaskRecord =>
        Boolean(dependency) && dependency.status !== 'completed'
    )
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}
function completionGuard(tasks: Record<string, TaskRecord>, task: TaskRecord): void {
  if (task.blocker) {
    throw new Error('TASK_COMPLETE_BLOCKED');
  }
  const unresolved = unresolvedTaskDependencies(tasks, task);
  if (unresolved.length > 0) {
    throw new Error(
      ['TASK_COMPLETE_DEPENDENCIES_PENDING', ...unresolved.map((dependency) => dependency.id)].join(
        ' '
      )
    );
  }
  const openChildren = directChildren(tasks, task.id).filter(
    (child) => child.status !== 'completed' && child.status !== 'cancelled'
  );
  if (openChildren.length > 0) {
    throw new Error(
      ['TASK_COMPLETE_CHILDREN_OPEN', ...openChildren.map((child) => child.id)].join(' ')
    );
  }
  if (task.progress.total > 0 && task.progress.completed !== task.progress.total) {
    throw new Error(
      [
        'TASK_COMPLETE_PROGRESS_INCOMPLETE',
        `${task.progress.completed}/${task.progress.total}`,
      ].join(' ')
    );
  }
}
function lifecycleAllowed(current: TaskStatus, next: TaskStatus): boolean {
  if (current === 'pending') {
    return next === 'active' || next === 'cancelled';
  }
  if (current === 'active') {
    return next === 'blocked' || next === 'completed' || next === 'cancelled';
  }
  if (current === 'blocked') {
    return next === 'active' || next === 'cancelled';
  }
  if (current === 'completed') {
    return false;
  }
  if (current === 'cancelled') {
    return false;
  }
  return false;
}
export function computedTaskProgress(
  tasks: Record<string, TaskRecord>,
  task: TaskRecord
): TaskComputedProgress {
  const children = directChildren(tasks, task.id);
  if (children.length > 0) {
    const done = children.filter(
      (child) => child.status === 'completed' || child.status === 'cancelled'
    ).length;
    return {
      done,
      total: children.length,
      percent: Math.floor((done / children.length) * 100),
      source: 'children',
    };
  }
  const total = task.progress.total;
  const done = task.progress.completed;
  return {
    done,
    total,
    percent:
      total === 0 ? (task.status === 'completed' ? 100 : 0) : Math.floor((done / total) * 100),
    source: 'explicit',
  };
}
export function emptyTaskProjection(projectId: string): TaskProjection {
  return {
    version: 1,
    projectId,
    operationCount: 0,
    lastSequence: 0,
    generatedAt: new Date(0).toISOString(),
    tasks: {},
  };
}
export function applyTaskOperation(
  state: TaskProjection,
  operation: TaskOperation
): TaskProjection {
  if (operation.projectId !== state.projectId) {
    throw new Error('TASK_PROJECT_MISMATCH');
  }
  if (operation.sequence !== state.lastSequence + 1) {
    throw new Error(
      [
        'TASK_SEQUENCE_GAP',
        `expected=${state.lastSequence + 1}`,
        `actual=${operation.sequence}`,
      ].join(' ')
    );
  }
  if (taskPayloadHash(operation.payload) !== operation.payloadSha256) {
    throw new Error('TASK_OPERATION_HASH_MISMATCH');
  }
  const tasks = {
    ...state.tasks,
  };
  const payload = operation.payload;
  if (payload.type === 'task.created') {
    const input = payload.task;
    if (tasks[input.id]) {
      throw new Error(`TASK_ALREADY_EXISTS id=${input.id}`);
    }
    requiredText(input.title, 'TASK_TITLE_REQUIRED');
    if (!PRIORITIES.has(input.priority)) {
      throw new Error('TASK_PRIORITY_INVALID');
    }
    if (!STATUSES.has(input.status)) {
      throw new Error('TASK_STATUS_INVALID');
    }
    validOrder(input.order);
    if (input.kind === 'goal' && input.parentTaskId) {
      throw new Error('TASK_GOAL_CANNOT_HAVE_PARENT');
    }
    if (input.kind === 'subtask' && !input.parentTaskId) {
      throw new Error('TASK_SUBTASK_REQUIRES_PARENT');
    }
    if (input.parentTaskId && !tasks[input.parentTaskId]) {
      throw new Error(`TASK_PARENT_NOT_FOUND id=${input.parentTaskId}`);
    }
    const created: TaskRecord = {
      id: input.id,
      projectId: state.projectId,
      kind: input.kind,
      ...(input.parentTaskId
        ? {
            parentTaskId: input.parentTaskId,
          }
        : {}),
      title: input.title,
      ...(input.description
        ? {
            description: input.description,
          }
        : {}),
      status: input.status,
      priority: input.priority,
      labels: [...input.labels],
      order: input.order,
      ...(input.assignedAgentId
        ? {
            assignedAgentId: input.assignedAgentId,
          }
        : {}),
      progress: {
        completed: 0,
        total: 0,
      },
      dependencies: [],
      evidence: [],
      filesTouched: [],
      tests: [],
      handoffHistory: [],
      resolvedConflicts: [],
      createdAt: operation.occurredAt,
      updatedAt: operation.occurredAt,
      createdBy: copyActor(operation.actor),
      updatedBy: copyActor(operation.actor),
      revision: 1,
    };
    tasks[created.id] = created;
  }
  if (payload.type === 'task.patched') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    tasks[current.id] = applyPatch(current, payload.patch, operation);
  }
  /*
   * Legacy Phase 33 compatibility.
   *
   * Existing task.status.set events must remain replayable.
   * New state-engine callers never use this primitive.
   */
  if (payload.type === 'task.status.set') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    if (!STATUSES.has(payload.status)) {
      throw new Error('TASK_STATUS_INVALID');
    }
    validRevision(payload.expectedRevision, current.revision);
    tasks[current.id] = {
      ...current,
      status: payload.status,
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.lifecycle.transition') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    if (!lifecycleAllowed(current.status, payload.status)) {
      throw new Error(
        ['TASK_LIFECYCLE_INVALID', `from=${current.status}`, `to=${payload.status}`].join(' ')
      );
    }
    if (payload.status === 'blocked') {
      const reason = requiredText(payload.blockerReason ?? '', 'TASK_BLOCKER_REASON_REQUIRED');
      tasks[current.id] = {
        ...current,
        status: 'blocked',
        blocker: {
          reason,
          blockedAt: operation.occurredAt,
          actor: copyActor(operation.actor),
        },
        ...(payload.nextAction
          ? {
              nextAction: payload.nextAction,
            }
          : {}),
        ...updated(current, operation),
      };
    }
    if (payload.status === 'active') {
      const next: TaskRecord = {
        ...current,
        status: 'active',
        ...updated(current, operation),
      };
      delete next.blocker;
      if (payload.nextAction !== undefined) {
        if (payload.nextAction.trim()) {
          next.nextAction = payload.nextAction;
        } else {
          delete next.nextAction;
        }
      }
      tasks[current.id] = next;
    }
    if (payload.status === 'completed') {
      completionGuard(tasks, current);
      const next: TaskRecord = {
        ...current,
        status: 'completed',
        ...updated(current, operation),
      };
      delete next.blocker;
      delete next.nextAction;
      delete next.activeLease;
      tasks[current.id] = next;
    }
    if (payload.status === 'cancelled') {
      const next: TaskRecord = {
        ...current,
        status: 'cancelled',
        ...updated(current, operation),
      };
      delete next.blocker;
      delete next.nextAction;
      delete next.activeLease;
      tasks[current.id] = next;
    }
  }
  if (payload.type === 'task.progress.set') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    validProgress(payload.completed, payload.total);
    tasks[current.id] = {
      ...current,
      progress: {
        completed: payload.completed,
        total: payload.total,
      },
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.next-action.set') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    const next: TaskRecord = {
      ...current,
      ...updated(current, operation),
    };
    if (payload.nextAction === null || !payload.nextAction.trim()) {
      delete next.nextAction;
    } else {
      next.nextAction = payload.nextAction;
    }
    tasks[current.id] = next;
  }
  if (payload.type === 'task.dependency.add') {
    const current = tasks[payload.taskId];
    const dependency = tasks[payload.dependencyTaskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    if (!dependency) {
      throw new Error(`TASK_DEPENDENCY_NOT_FOUND id=${payload.dependencyTaskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    if (current.id === dependency.id) {
      throw new Error('TASK_DEPENDENCY_SELF');
    }
    if (dependencyPathExists(tasks, dependency.id, current.id)) {
      throw new Error('TASK_DEPENDENCY_CYCLE');
    }
    const dependencies = new Set(current.dependencies);
    dependencies.add(dependency.id);
    tasks[current.id] = {
      ...current,
      dependencies: [...dependencies].sort(),
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.dependency.remove') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    tasks[current.id] = {
      ...current,
      dependencies: current.dependencies.filter(
        (dependency) => dependency !== payload.dependencyTaskId
      ),
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.evidence.add') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    if (!EVIDENCE_KINDS.has(payload.evidence.kind)) {
      throw new Error('TASK_EVIDENCE_KIND_INVALID');
    }
    const summary = requiredText(payload.evidence.summary, 'TASK_EVIDENCE_SUMMARY_REQUIRED');
    if (current.evidence.some((evidence) => evidence.id === payload.evidence.id)) {
      throw new Error(`TASK_EVIDENCE_ALREADY_EXISTS id=${payload.evidence.id}`);
    }
    tasks[current.id] = {
      ...current,
      evidence: [
        ...current.evidence,
        {
          id: payload.evidence.id,
          kind: payload.evidence.kind,
          summary,
          ...(payload.evidence.ref
            ? {
                ref: payload.evidence.ref,
              }
            : {}),
          createdAt: operation.occurredAt,
          actor: copyActor(operation.actor),
        },
      ],
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.file.touched') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    const filePath = requiredText(payload.filePath, 'TASK_FILE_PATH_REQUIRED');
    const files = new Set(current.filesTouched);
    files.add(filePath);
    tasks[current.id] = {
      ...current,
      filesTouched: [...files].sort(),
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.test.recorded') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    if (!TEST_OUTCOMES.has(payload.test.outcome)) {
      throw new Error('TASK_TEST_OUTCOME_INVALID');
    }
    const name = requiredText(payload.test.name, 'TASK_TEST_NAME_REQUIRED');
    if (current.tests.some((test) => test.id === payload.test.id)) {
      throw new Error(`TASK_TEST_ALREADY_EXISTS id=${payload.test.id}`);
    }
    tasks[current.id] = {
      ...current,
      tests: [
        ...current.tests,
        {
          id: payload.test.id,
          name,
          outcome: payload.test.outcome,
          ...(payload.test.detail
            ? {
                detail: payload.test.detail,
              }
            : {}),
          recordedAt: operation.occurredAt,
          actor: copyActor(operation.actor),
        },
      ],
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.replication.conflict.resolved') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    validRevision(payload.expectedRevision, current.revision);
    const resolutions = (current.resolvedConflicts ?? []).filter(
      (resolution) => resolution.conflictId !== payload.conflictId
    );
    tasks[current.id] = {
      ...current,
      resolvedConflicts: [
        ...resolutions,
        {
          conflictId: requiredText(payload.conflictId, 'TASK_CONFLICT_ID_REQUIRED'),
          resolvedBy: copyActor(operation.actor),
          resolvedAt: operation.occurredAt,
          ...(payload.leaseOwner
            ? {
                leaseOwner: requiredText(payload.leaseOwner, 'TASK_AGENT_ID_REQUIRED'),
              }
            : {}),
        },
      ],
      ...updated(current, operation),
    };
  }
  if (payload.type === 'task.completion.recorded') {
    const current = tasks[payload.taskId];
    if (!current) {
      throw new Error(`TASK_NOT_FOUND id=${payload.taskId}`);
    }
    if (current.status !== 'completed') {
      throw new Error('TASK_COMPLETION_REQUIRES_COMPLETED');
    }
    if (current.completion && current.completion.digest === payload.completion.digest) {
      return {
        version: 1,
        projectId: state.projectId,
        operationCount: state.operationCount + 1,
        lastSequence: operation.sequence,
        lastOperationId: operation.operationId,
        generatedAt: operation.occurredAt,
        tasks,
      };
    }
    validRevision(payload.expectedRevision, current.revision);
    const completion = completionSnapshot(payload, operation, current);
    tasks[current.id] = {
      ...current,
      completion,
      ...updated(current, operation),
    };
  }
  if (isTaskAgentOperationPayload(payload)) {
    applyTaskAgentOperation(tasks, operation);
  }
  return {
    version: 1,
    projectId: state.projectId,
    operationCount: state.operationCount + 1,
    lastSequence: operation.sequence,
    lastOperationId: operation.operationId,
    generatedAt: operation.occurredAt,
    tasks,
  };
}
export function projectTaskOperations(
  projectId: string,
  operations: TaskOperation[]
): TaskProjection {
  let state = emptyTaskProjection(projectId);
  for (const operation of operations) {
    state = applyTaskOperation(state, operation);
  }
  return state;
}
export function taskRecords(state: TaskProjection): TaskRecord[] {
  return Object.values(state.tasks).sort(
    (left, right) =>
      left.order - right.order ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}
