import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import type { ProjectManifest } from '../core/types.js';
import { sanitizeDurableText, sanitizeDurableValue } from '../security/durable-sanitizer.js';
import { createTaskOperation, readTaskOperations, taskOperationLogPath } from './operation-log.js';
import { applyTaskOperation, projectTaskOperations, taskRecords } from './projection.js';
import type {
  TaskActor,
  TaskCreateInput,
  TaskListOptions,
  TaskMutationOptions,
  TaskOperationPayload,
  TaskPatch,
  TaskPriority,
  TaskProjection,
  TaskRecord,
  TaskStatus,
} from './types.js';
const LOCK_STALE_MS = 30_000;
const LOCK_RETRY_MS = 20;
const LOCK_ATTEMPTS = 250;
const PRIORITIES = new Set<TaskPriority>(['critical', 'high', 'normal', 'low']);
function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}
function processAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid < 1) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') {
      return false;
    }
    return true;
  }
}
function taskDirectory(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'tasks');
}
export function taskProjectionPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(taskDirectory(project), 'state.json');
}
function taskLockPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'runtime', 'locks', 'tasks.lock');
}
function lockIsRecoverable(file: string): boolean {
  let stat;
  try {
    stat = statSync(file);
  } catch {
    return true;
  }
  if (Date.now() - stat.mtimeMs < LOCK_STALE_MS) {
    return false;
  }
  try {
    const value = JSON.parse(readFileSync(file, 'utf8')) as {
      pid?: number;
    };
    if (typeof value.pid === 'number' && processAlive(value.pid)) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}
async function acquireTaskLock(project: Pick<ProjectManifest, 'rootPath'>): Promise<string> {
  const file = taskLockPath(project);
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    const token = randomUUID();
    try {
      const fd = openSync(file, 'wx', 0o600);
      try {
        writeFileSync(
          fd,
          JSON.stringify({
            version: 1,
            token,
            pid: process.pid,
            createdAt: new Date().toISOString(),
          }) + '\n'
        );
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      return token;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      if (lockIsRecoverable(file)) {
        try {
          unlinkSync(file);
        } catch {
          // Another process may have recovered first.
        }
        continue;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
  throw new Error('TASK_LOCK_TIMEOUT');
}
function releaseTaskLock(project: Pick<ProjectManifest, 'rootPath'>, token: string): void {
  const file = taskLockPath(project);
  if (!existsSync(file)) {
    return;
  }
  try {
    const current = JSON.parse(readFileSync(file, 'utf8')) as {
      token?: string;
    };
    if (current.token !== token) {
      return;
    }
    unlinkSync(file);
  } catch {
    /*
     * Never delete a lock if ownership cannot be proven.
     */
  }
}
function atomicWriteProjection(
  project: Pick<ProjectManifest, 'rootPath'>,
  projection: TaskProjection
): void {
  const target = taskProjectionPath(project);
  mkdirSync(dirname(target), {
    recursive: true,
    mode: 0o700,
  });
  const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
  const fd = openSync(temporary, 'w', 0o600);
  try {
    writeFileSync(fd, JSON.stringify(projection, null, 2) + '\n');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, target);
}
function appendOperation(file: string, operation: unknown): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  let prefix = '';
  if (existsSync(file)) {
    const current = readFileSync(file, 'utf8');
    if (current && !current.endsWith('\n')) {
      prefix = '\n';
    }
  }
  const fd = openSync(file, 'a', 0o600);
  try {
    appendFileSync(fd, prefix + JSON.stringify(operation) + '\n');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function normalizedLabels(labels: string[] | undefined): string[] {
  if (!labels) {
    return [];
  }
  const output = new Set<string>();
  for (const label of labels) {
    const normalized = sanitizeDurableText(label).trim();
    if (normalized) {
      output.add(normalized);
    }
  }
  return [...output].sort();
}
function normalizedActor(actor: TaskActor | undefined): TaskActor | undefined {
  if (!actor) {
    return undefined;
  }
  return sanitizeDurableValue(actor);
}
function normalizedPriority(priority: TaskPriority | undefined): TaskPriority {
  const value = priority ?? 'normal';
  if (!PRIORITIES.has(value)) {
    throw new Error('TASK_PRIORITY_INVALID');
  }
  return value;
}
function normalizedOrder(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('TASK_ORDER_INVALID');
  }
  return value;
}
function nextSiblingOrder(projection: TaskProjection, parentTaskId: string | undefined): number {
  const siblings = taskRecords(projection).filter((task) => task.parentTaskId === parentTaskId);
  if (siblings.length === 0) {
    return 0;
  }
  return Math.max(...siblings.map((task) => task.order)) + 1;
}
export class TaskStore {
  constructor(private readonly project: Pick<ProjectManifest, 'id' | 'rootPath'>) {}
  private readProjection(repairCorruptTail = false): TaskProjection {
    const operations = readTaskOperations(taskOperationLogPath(this.project), {
      repairCorruptTail,
    });
    return projectTaskOperations(this.project.id, operations);
  }
  projection(): TaskProjection {
    return this.readProjection(false);
  }
  getTask(taskId: string): TaskRecord | undefined {
    return this.readProjection(false).tasks[taskId];
  }
  listTasks(options: TaskListOptions = {}): TaskRecord[] {
    return taskRecords(this.readProjection(false)).filter((task) => {
      if (options.parentTaskId !== undefined) {
        const expected = options.parentTaskId ?? undefined;
        if (task.parentTaskId !== expected) {
          return false;
        }
      }
      if (options.status && task.status !== options.status) {
        return false;
      }
      if (options.kind && task.kind !== options.kind) {
        return false;
      }
      if (options.assignedAgentId && task.assignedAgentId !== options.assignedAgentId) {
        return false;
      }
      return true;
    });
  }
  private async mutate(
    build: (projection: TaskProjection) => ReturnType<typeof createTaskOperation>
  ): Promise<TaskProjection> {
    const token = await acquireTaskLock(this.project);
    try {
      const file = taskOperationLogPath(this.project);
      const operations = readTaskOperations(file, {
        repairCorruptTail: true,
      });
      const projection = projectTaskOperations(this.project.id, operations);
      const operation = build(projection);
      /*
       * Validate mutation before durable append.
       *
       * Stale revision / invalid parent / duplicate task
       * must never enter the authoritative log.
       */
      const next = applyTaskOperation(projection, operation);
      appendOperation(file, operation);
      atomicWriteProjection(this.project, next);
      return next;
    } finally {
      releaseTaskLock(this.project, token);
    }
  }
  async createTask(input: TaskCreateInput): Promise<TaskRecord> {
    const id = input.id?.trim() || randomUUID();
    const title = sanitizeDurableText(input.title).trim();
    if (!title) {
      throw new Error('TASK_TITLE_REQUIRED');
    }
    return (
      await this.mutate((projection) => {
        const parentTaskId = input.parentTaskId?.trim() || undefined;
        const order =
          input.order !== undefined
            ? normalizedOrder(input.order)
            : nextSiblingOrder(projection, parentTaskId);
        return createTaskOperation({
          projectId: this.project.id,
          sequence: projection.lastSequence + 1,
          actor: normalizedActor(input.actor),
          payload: {
            type: 'task.created',
            task: {
              id,
              kind: input.kind,
              ...(parentTaskId
                ? {
                    parentTaskId,
                  }
                : {}),
              title,
              ...(input.description
                ? {
                    description: sanitizeDurableText(input.description),
                  }
                : {}),
              status: 'pending',
              priority: normalizedPriority(input.priority),
              labels: normalizedLabels(input.labels),
              order,
              ...(input.assignedAgentId?.trim()
                ? {
                    assignedAgentId: sanitizeDurableText(input.assignedAgentId).trim(),
                  }
                : {}),
            },
          },
        });
      })
    ).tasks[id]!;
  }
  async patchTask(
    taskId: string,
    patch: TaskPatch,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const id = taskId.trim();
    if (!id) {
      throw new Error('TASK_ID_REQUIRED');
    }
    const normalized: TaskPatch = {};
    if (patch.title !== undefined) {
      const title = sanitizeDurableText(patch.title).trim();
      if (!title) {
        throw new Error('TASK_TITLE_REQUIRED');
      }
      normalized.title = title;
    }
    if (patch.description !== undefined) {
      normalized.description =
        patch.description === null ? null : sanitizeDurableText(patch.description);
    }
    if (patch.priority !== undefined) {
      normalized.priority = normalizedPriority(patch.priority);
    }
    if (patch.labels !== undefined) {
      normalized.labels = normalizedLabels(patch.labels);
    }
    if (patch.order !== undefined) {
      normalized.order = normalizedOrder(patch.order);
    }
    if (patch.assignedAgentId !== undefined) {
      normalized.assignedAgentId =
        patch.assignedAgentId === null ? null : sanitizeDurableText(patch.assignedAgentId).trim();
    }
    if (Object.keys(normalized).length === 0) {
      throw new Error('TASK_PATCH_EMPTY');
    }
    const next = await this.mutate((projection) =>
      createTaskOperation({
        projectId: this.project.id,
        sequence: projection.lastSequence + 1,
        actor: normalizedActor(options.actor),
        payload: {
          type: 'task.patched',
          taskId: id,
          ...(options.expectedRevision !== undefined
            ? {
                expectedRevision: options.expectedRevision,
              }
            : {}),
          patch: normalized,
        },
      })
    );
    return next.tasks[id]!;
  }
  /*
   * Phase 33 exposes the primitive.
   *
   * Phase 34 will wrap this with the full deterministic
   * lifecycle transition policy and evidence rules.
   */
  async setTaskStatus(
    taskId: string,
    status: TaskStatus,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    const id = taskId.trim();
    if (!id) {
      throw new Error('TASK_ID_REQUIRED');
    }
    const next = await this.mutate((projection) =>
      createTaskOperation({
        projectId: this.project.id,
        sequence: projection.lastSequence + 1,
        actor: normalizedActor(options.actor),
        payload: {
          type: 'task.status.set',
          taskId: id,
          status,
          ...(options.expectedRevision !== undefined
            ? {
                expectedRevision: options.expectedRevision,
              }
            : {}),
        },
      })
    );
    return next.tasks[id]!;
  }
  async applyStateOperation(
    payload: TaskOperationPayload,
    actor?: TaskActor,
    occurredAt?: string
  ): Promise<TaskProjection> {
    return this.mutate((projection) =>
      createTaskOperation({
        projectId: this.project.id,
        sequence: projection.lastSequence + 1,
        actor: normalizedActor(actor),
        ...(occurredAt
          ? {
              occurredAt,
            }
          : {}),
        payload,
      })
    );
  }
  rebuildProjection(): TaskProjection {
    const projection = this.readProjection(true);
    atomicWriteProjection(this.project, projection);
    return projection;
  }
}
