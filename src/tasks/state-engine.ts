import { randomUUID } from 'node:crypto';
import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import { computedTaskProgress, taskRecords, unresolvedTaskDependencies } from './projection.js';
import { TaskStore } from './store.js';
import type {
  TaskActor,
  TaskEvidenceKind,
  TaskMutationOptions,
  TaskRecord,
  TaskResumeState,
  TaskTestOutcome,
} from './types.js';
function text(value: string, code: string): string {
  const normalized = sanitizeDurableText(value).trim();
  if (!normalized) {
    throw new Error(code);
  }
  return normalized;
}
export interface AddEvidenceInput {
  kind: TaskEvidenceKind;
  summary: string;
  ref?: string;
}
export interface RecordTestInput {
  name: string;
  outcome: TaskTestOutcome;
  detail?: string;
}
export class TaskStateEngine {
  constructor(private readonly store: TaskStore) {}
  private task(taskId: string): TaskRecord {
    const task = this.store.getTask(taskId);
    if (!task) {
      throw new Error(`TASK_NOT_FOUND id=${taskId}`);
    }
    return task;
  }
  start(taskId: string, options: TaskMutationOptions = {}): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.lifecycle.transition',
        taskId: current.id,
        status: 'active',
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  block(
    taskId: string,
    reason: string,
    nextAction?: string,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.lifecycle.transition',
        taskId: current.id,
        status: 'blocked',
        blockerReason: text(reason, 'TASK_BLOCKER_REASON_REQUIRED'),
        ...(nextAction
          ? {
              nextAction: text(nextAction, 'TASK_NEXT_ACTION_REQUIRED'),
            }
          : {}),
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  resume(taskId: string, options: TaskMutationOptions = {}): Promise<TaskRecord> {
    const current = this.task(taskId);
    if (current.status !== 'blocked') {
      throw new Error(`TASK_RESUME_REQUIRES_BLOCKED status=${current.status}`);
    }
    return this.transitionResult(
      current.id,
      {
        type: 'task.lifecycle.transition',
        taskId: current.id,
        status: 'active',
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  complete(taskId: string, options: TaskMutationOptions = {}): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.lifecycle.transition',
        taskId: current.id,
        status: 'completed',
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  cancel(taskId: string, options: TaskMutationOptions = {}): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.lifecycle.transition',
        taskId: current.id,
        status: 'cancelled',
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  setProgress(
    taskId: string,
    completed: number,
    total: number,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.progress.set',
        taskId: current.id,
        completed,
        total,
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  setNextAction(
    taskId: string,
    nextAction: string | null,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.next-action.set',
        taskId: current.id,
        nextAction: nextAction === null ? null : text(nextAction, 'TASK_NEXT_ACTION_REQUIRED'),
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  addDependency(
    taskId: string,
    dependencyTaskId: string,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    const dependency = this.task(dependencyTaskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.dependency.add',
        taskId: current.id,
        dependencyTaskId: dependency.id,
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  removeDependency(
    taskId: string,
    dependencyTaskId: string,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.dependency.remove',
        taskId: current.id,
        dependencyTaskId: dependencyTaskId.trim(),
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  addEvidence(
    taskId: string,
    input: AddEvidenceInput,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.evidence.add',
        taskId: current.id,
        evidence: {
          id: randomUUID(),
          kind: input.kind,
          summary: text(input.summary, 'TASK_EVIDENCE_SUMMARY_REQUIRED'),
          ...(input.ref
            ? {
                ref: text(input.ref, 'TASK_EVIDENCE_REF_REQUIRED'),
              }
            : {}),
        },
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  touchFile(
    taskId: string,
    filePath: string,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.file.touched',
        taskId: current.id,
        filePath: text(filePath, 'TASK_FILE_PATH_REQUIRED'),
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  recordTest(
    taskId: string,
    input: RecordTestInput,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const current = this.task(taskId);
    return this.transitionResult(
      current.id,
      {
        type: 'task.test.recorded',
        taskId: current.id,
        test: {
          id: randomUUID(),
          name: text(input.name, 'TASK_TEST_NAME_REQUIRED'),
          outcome: input.outcome,
          ...(input.detail
            ? {
                detail: sanitizeDurableText(input.detail),
              }
            : {}),
        },
        ...(options.expectedRevision !== undefined
          ? {
              expectedRevision: options.expectedRevision,
            }
          : {}),
      },
      options.actor
    );
  }
  resumeState(taskId: string): TaskResumeState {
    const projection = this.store.projection();
    const root = projection.tasks[taskId];
    if (!root) {
      throw new Error(`TASK_NOT_FOUND id=${taskId}`);
    }
    const children = taskRecords(projection).filter((task) => task.parentTaskId === root.id);
    const active = children.find((task) => task.status === 'active' || task.status === 'blocked');
    const pendingReady = children.find(
      (task) =>
        task.status === 'pending' && unresolvedTaskDependencies(projection.tasks, task).length === 0
    );
    const resumeTask = active ?? pendingReady ?? root;
    return {
      rootTask: root,
      resumeTask,
      progress: computedTaskProgress(projection.tasks, root),
      ...(resumeTask.blocker
        ? {
            blocker: resumeTask.blocker,
          }
        : {}),
      ...(resumeTask.nextAction
        ? {
            nextAction: resumeTask.nextAction,
          }
        : {}),
      unresolvedDependencies: unresolvedTaskDependencies(projection.tasks, resumeTask),
      children,
    };
  }
  private async transitionResult(
    taskId: string,
    payload: Parameters<TaskStore['applyStateOperation']>[0],
    actor?: TaskActor
  ): Promise<TaskRecord> {
    const projection = await this.store.applyStateOperation(payload, actor);
    const task = projection.tasks[taskId];
    if (!task) {
      throw new Error(`TASK_NOT_FOUND_AFTER_MUTATION id=${taskId}`);
    }
    return task;
  }
}
