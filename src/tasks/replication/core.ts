import { createHash } from 'node:crypto';
import { stableStringify } from '../../session/utils.js';
import { taskPayloadHash, validateTaskOperation } from '../operation-log.js';
import { applyTaskOperation, emptyTaskProjection } from '../projection.js';
import type { TaskOperation, TaskOperationPayload, TaskProjection, TaskStatus } from '../types.js';
import type {
  TaskConvergenceResult,
  TaskReplicationBatch,
  TaskReplicationConflict,
} from './types.js';

export const TASK_REPLICATION_MAX_OPERATIONS = 256;
export const TASK_REPLICATION_MAX_BATCH_BYTES = 512 * 1024;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function text(value: string, name: string, max = 300): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name}_REQUIRED`);
  }
  if (normalized.length > max) {
    throw new Error(`${name}_TOO_LONG`);
  }
  return normalized;
}

export function replicationOperationKey(
  operation: Pick<TaskOperation, 'hostId' | 'operationId'>
): string {
  return `${operation.hostId}\u0000${operation.operationId}`;
}

export function operationDigest(operation: TaskOperation): string {
  return sha256(stableStringify(operation));
}

export function operationsDigest(operations: TaskOperation[]): string {
  return sha256(stableStringify(operations));
}

export function replicationBatchId(input: {
  projectId: string;
  hostId: string;
  firstLocalSequence: number;
  lastLocalSequence: number;
  operationsSha256: string;
}): string {
  return `task-batch-${sha256(stableStringify(input)).slice(0, 40)}`;
}

export function createTaskReplicationBatch(
  projectId: string,
  hostId: string,
  operations: TaskOperation[],
  createdAt: string
): TaskReplicationBatch {
  if (operations.length === 0) {
    throw new Error('TASK_REPLICATION_BATCH_EMPTY');
  }
  if (operations.length > TASK_REPLICATION_MAX_OPERATIONS) {
    throw new Error('TASK_REPLICATION_BATCH_TOO_LARGE');
  }
  const ordered = [...operations].sort(compareOperationIdentity);
  const firstLocalSequence = Math.min(...ordered.map((operation) => operation.sequence));
  const lastLocalSequence = Math.max(...ordered.map((operation) => operation.sequence));
  const operationsSha256 = operationsDigest(ordered);
  const batchId = replicationBatchId({
    projectId,
    hostId,
    firstLocalSequence,
    lastLocalSequence,
    operationsSha256,
  });
  const batch: TaskReplicationBatch = {
    version: 1,
    projectId,
    hostId,
    batchId,
    firstLocalSequence,
    lastLocalSequence,
    operations: ordered,
    createdAt,
    operationsSha256,
  };
  if (Buffer.byteLength(JSON.stringify(batch), 'utf8') > TASK_REPLICATION_MAX_BATCH_BYTES) {
    throw new Error('TASK_REPLICATION_BATCH_TOO_LARGE');
  }
  return batch;
}

export function validateTaskReplicationBatch(
  value: unknown,
  expectedProjectId?: string
): TaskReplicationBatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('TASK_REPLICATION_BATCH_INVALID');
  }
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) {
    throw new Error('TASK_REPLICATION_BATCH_VERSION_INVALID');
  }
  const projectId = text(String(raw.projectId ?? ''), 'TASK_REPLICATION_PROJECT');
  if (expectedProjectId && projectId !== expectedProjectId) {
    throw new Error('TASK_REPLICATION_PROJECT_MISMATCH');
  }
  const hostId = text(String(raw.hostId ?? ''), 'TASK_REPLICATION_HOST', 200);
  const batchId = text(String(raw.batchId ?? ''), 'TASK_REPLICATION_BATCH_ID', 100);
  const firstLocalSequence = raw.firstLocalSequence;
  const lastLocalSequence = raw.lastLocalSequence;
  if (
    !Number.isSafeInteger(firstLocalSequence) ||
    !Number.isSafeInteger(lastLocalSequence) ||
    Number(firstLocalSequence) < 1 ||
    Number(lastLocalSequence) < Number(firstLocalSequence)
  ) {
    throw new Error('TASK_REPLICATION_SEQUENCE_INVALID');
  }
  if (!Array.isArray(raw.operations) || raw.operations.length === 0) {
    throw new Error('TASK_REPLICATION_BATCH_EMPTY');
  }
  if (raw.operations.length > TASK_REPLICATION_MAX_OPERATIONS) {
    throw new Error('TASK_REPLICATION_BATCH_TOO_LARGE');
  }
  if (typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt))) {
    throw new Error('TASK_REPLICATION_TIMESTAMP_INVALID');
  }
  if (typeof raw.operationsSha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(raw.operationsSha256)) {
    throw new Error('TASK_REPLICATION_HASH_INVALID');
  }
  const operations = raw.operations.map((operation) => validateTaskOperation(operation));
  for (const operation of operations) {
    if (operation.projectId !== projectId || operation.hostId !== hostId) {
      throw new Error('TASK_REPLICATION_OPERATION_SCOPE_INVALID');
    }
  }
  const ordered = [...operations].sort(compareOperationIdentity);
  if (
    Number(ordered[0]?.sequence) !== Number(firstLocalSequence) ||
    Number(ordered.at(-1)?.sequence) !== Number(lastLocalSequence)
  ) {
    throw new Error('TASK_REPLICATION_SEQUENCE_RANGE_INVALID');
  }
  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index]!.sequence !== Number(firstLocalSequence) + index) {
      throw new Error('TASK_REPLICATION_SEQUENCE_GAP');
    }
  }
  if (operationsDigest(ordered) !== raw.operationsSha256) {
    throw new Error('TASK_REPLICATION_HASH_MISMATCH');
  }
  const expectedBatchId = replicationBatchId({
    projectId,
    hostId,
    firstLocalSequence: Number(firstLocalSequence),
    lastLocalSequence: Number(lastLocalSequence),
    operationsSha256: raw.operationsSha256,
  });
  if (expectedBatchId !== batchId) {
    throw new Error('TASK_REPLICATION_BATCH_ID_MISMATCH');
  }
  const batch = {
    version: 1 as const,
    projectId,
    hostId,
    batchId,
    firstLocalSequence: Number(firstLocalSequence),
    lastLocalSequence: Number(lastLocalSequence),
    operations: ordered,
    createdAt: raw.createdAt,
    operationsSha256: raw.operationsSha256,
  };
  if (Buffer.byteLength(JSON.stringify(batch), 'utf8') > TASK_REPLICATION_MAX_BATCH_BYTES) {
    throw new Error('TASK_REPLICATION_BATCH_TOO_LARGE');
  }
  return batch;
}

export function taskReplicationBatchKey(
  batch: Pick<TaskReplicationBatch, 'projectId' | 'hostId' | 'batchId'>
): string {
  return `projects/${encodeURIComponent(batch.projectId)}/tasks/v1/hosts/${encodeURIComponent(batch.hostId)}/batches/${encodeURIComponent(batch.batchId)}.json`;
}

function conflictId(code: string, keys: string[], taskId?: string): string {
  return `replication-conflict-${sha256(stableStringify({ code, keys: [...keys].sort(), taskId: taskId ?? null })).slice(0, 40)}`;
}

function compareOperationIdentity(left: TaskOperation, right: TaskOperation): number {
  const host = left.hostId.localeCompare(right.hostId);
  if (host !== 0) {
    return host;
  }
  const sequence = left.sequence - right.sequence;
  if (sequence !== 0) {
    return sequence;
  }
  const id = left.operationId.localeCompare(right.operationId);
  if (id !== 0) {
    return id;
  }
  return left.payloadSha256.localeCompare(right.payloadSha256);
}

function operationTaskId(operation: TaskOperation): string | undefined {
  const payload = operation.payload as unknown as Record<string, unknown>;
  if (typeof payload.taskId === 'string') {
    return payload.taskId;
  }
  const task = payload.task;
  if (payload.type === 'task.created' && task && typeof task === 'object' && !Array.isArray(task)) {
    const id = (task as Record<string, unknown>).id;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

function operationStatus(operation: TaskOperation): TaskStatus | undefined {
  const payload = operation.payload as unknown as Record<string, unknown>;
  if (payload.type !== 'task.lifecycle.transition' && payload.type !== 'task.status.set') {
    return undefined;
  }
  return typeof payload.status === 'string' ? (payload.status as TaskStatus) : undefined;
}

function isLeaseOperation(operation: TaskOperation): boolean {
  return operation.payload.type.startsWith('task.agent.');
}

function isCompletionOperation(operation: TaskOperation): boolean {
  return operation.payload.type === 'task.completion.recorded';
}

function concurrentConflict(
  left: TaskOperation,
  right: TaskOperation,
  taskId: string | undefined
): TaskReplicationConflict | undefined {
  if (!taskId || left.hostId === right.hostId) {
    return undefined;
  }
  const leftStatus = operationStatus(left);
  const rightStatus = operationStatus(right);
  if (
    leftStatus &&
    rightStatus &&
    ((leftStatus === 'completed' && rightStatus === 'blocked') ||
      (leftStatus === 'blocked' && rightStatus === 'completed'))
  ) {
    const keys = [replicationOperationKey(left), replicationOperationKey(right)];
    return {
      id: conflictId('TASK_LIFECYCLE_CONFLICT', keys, taskId),
      code: 'TASK_LIFECYCLE_CONFLICT',
      taskId,
      operationKeys: keys,
      message: 'Concurrent completed and blocked lifecycle operations require review',
    };
  }
  if (isLeaseOperation(left) && isLeaseOperation(right)) {
    const leftPayload = left.payload as unknown as Record<string, unknown>;
    const rightPayload = right.payload as unknown as Record<string, unknown>;
    if (
      leftPayload.type === 'task.agent.claim' &&
      rightPayload.type === 'task.agent.claim' &&
      leftPayload.agentId !== rightPayload.agentId
    ) {
      const keys = [replicationOperationKey(left), replicationOperationKey(right)];
      return {
        id: conflictId('TASK_LEASE_CONFLICT', keys, taskId),
        code: 'TASK_LEASE_CONFLICT',
        taskId,
        operationKeys: keys,
        message: 'Concurrent claims by different agents cannot be resolved silently',
      };
    }
  }
  if (isCompletionOperation(left) && isCompletionOperation(right)) {
    const leftPayload = left.payload as unknown as Record<string, unknown>;
    const rightPayload = right.payload as unknown as Record<string, unknown>;
    const leftCompletion = leftPayload.completion as Record<string, unknown> | undefined;
    const rightCompletion = rightPayload.completion as Record<string, unknown> | undefined;
    if (leftCompletion?.digest !== rightCompletion?.digest) {
      const keys = [replicationOperationKey(left), replicationOperationKey(right)];
      return {
        id: conflictId('TASK_COMPLETION_CONFLICT', keys, taskId),
        code: 'TASK_COMPLETION_CONFLICT',
        taskId,
        operationKeys: keys,
        message: 'Concurrent immutable completion snapshots have different digests',
      };
    }
  }
  return undefined;
}

function dedupeOperations(operations: TaskOperation[]): {
  operations: TaskOperation[];
  conflicts: TaskReplicationConflict[];
} {
  const byKey = new Map<string, TaskOperation>();
  const conflicts: TaskReplicationConflict[] = [];
  for (const operation of operations) {
    const key = replicationOperationKey(operation);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, operation);
      continue;
    }
    if (operationDigest(existing) === operationDigest(operation)) {
      continue;
    }
    conflicts.push({
      id: conflictId('TASK_REPLICATION_OPERATION_COLLISION', [key]),
      code: 'TASK_REPLICATION_OPERATION_COLLISION',
      operationKeys: [key],
      message: 'One host/operation identity was reused with different content',
    });
  }
  return { operations: [...byKey.values()], conflicts };
}

function withoutForeignRevision(operation: TaskOperation): TaskOperation {
  const payload = operation.payload as unknown as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(payload, 'expectedRevision')) {
    return operation;
  }
  const withoutRevision = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== 'expectedRevision')
  );
  return {
    ...operation,
    payload: withoutRevision as unknown as TaskOperationPayload,
    payloadSha256: taskPayloadHash(withoutRevision as unknown as TaskOperationPayload),
  };
}

function operationReady(operation: TaskOperation, knownTaskIds: Set<string>): boolean {
  const taskId = operationTaskId(operation);
  if (operation.payload.type === 'task.created') {
    return (
      !operation.payload.task.parentTaskId || knownTaskIds.has(operation.payload.task.parentTaskId)
    );
  }
  return Boolean(taskId && knownTaskIds.has(taskId));
}

function canonicalOperationOrder(operations: TaskOperation[]): TaskOperation[] {
  const byHost = new Map<string, TaskOperation[]>();
  for (const operation of operations) {
    const list = byHost.get(operation.hostId) ?? [];
    list.push(operation);
    byHost.set(operation.hostId, list);
  }
  for (const list of byHost.values()) {
    list.sort(
      (left, right) =>
        left.sequence - right.sequence || left.operationId.localeCompare(right.operationId)
    );
  }
  const output: TaskOperation[] = [];
  const consumed = new Set<string>();
  const knownTaskIds = new Set<string>();
  while (output.length < operations.length) {
    const candidates = [...byHost.entries()]
      .map(([host, list]) => ({
        host,
        operation: list.find((item) => !consumed.has(replicationOperationKey(item))),
      }))
      .filter((item): item is { host: string; operation: TaskOperation } =>
        Boolean(item.operation)
      );
    if (candidates.length === 0) {
      break;
    }
    const available = candidates.filter(({ operation }) => operationReady(operation, knownTaskIds));
    const selected = (available.length > 0 ? available : candidates).sort((left, right) => {
      const leftCreated = left.operation.payload.type === 'task.created' ? 0 : 1;
      const rightCreated = right.operation.payload.type === 'task.created' ? 0 : 1;
      return (
        leftCreated - rightCreated || compareOperationIdentity(left.operation, right.operation)
      );
    })[0];
    if (!selected) {
      break;
    }
    consumed.add(replicationOperationKey(selected.operation));
    output.push(selected.operation);
    const selectedTaskId = operationTaskId(selected.operation);
    if (selected.operation.payload.type === 'task.created' && selectedTaskId) {
      knownTaskIds.add(selectedTaskId);
    }
  }
  return output;
}

export function convergeTaskOperations(
  projectId: string,
  operations: TaskOperation[],
  localHostId?: string
): TaskConvergenceResult {
  const valid: TaskOperation[] = [];
  const conflicts: TaskReplicationConflict[] = [];
  for (const raw of operations) {
    try {
      const operation = validateTaskOperation(raw);
      if (Buffer.byteLength(JSON.stringify(operation), 'utf8') > TASK_REPLICATION_MAX_BATCH_BYTES) {
        throw new Error('TASK_REPLICATION_OPERATION_TOO_LARGE');
      }
      if (operation.operationId.length > 300 || operation.hostId.length > 200) {
        throw new Error('TASK_REPLICATION_OPERATION_IDENTITY_TOO_LONG');
      }
      if (operation.projectId !== projectId) {
        conflicts.push({
          id: conflictId('TASK_REPLICATION_GUARD_REJECTED', [replicationOperationKey(operation)]),
          code: 'TASK_REPLICATION_GUARD_REJECTED',
          operationKeys: [replicationOperationKey(operation)],
          message: 'Remote operation belongs to another project',
        });
        continue;
      }
      valid.push(operation);
    } catch (error) {
      const key =
        raw && typeof raw === 'object' && 'hostId' in raw && 'operationId' in raw
          ? replicationOperationKey(raw as TaskOperation)
          : 'invalid-operation';
      conflicts.push({
        id: conflictId('TASK_REPLICATION_GUARD_REJECTED', [key]),
        code: 'TASK_REPLICATION_GUARD_REJECTED',
        operationKeys: [key],
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const deduped = dedupeOperations(valid);
  conflicts.push(...deduped.conflicts);
  const ordered = canonicalOperationOrder(deduped.operations);
  const byTask = new Map<string, TaskOperation[]>();
  for (const operation of ordered) {
    const taskId = operationTaskId(operation);
    if (!taskId) {
      continue;
    }
    const list = byTask.get(taskId) ?? [];
    list.push(operation);
    byTask.set(taskId, list);
  }
  for (const list of byTask.values()) {
    for (let index = 0; index < list.length; index += 1) {
      for (let next = index + 1; next < list.length; next += 1) {
        const conflict = concurrentConflict(
          list[index]!,
          list[next]!,
          operationTaskId(list[index]!)
        );
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
  }
  let state = emptyTaskProjection(projectId);
  const projected: TaskOperation[] = [];
  for (const operation of ordered) {
    try {
      state = applyTaskOperation(state, {
        ...(localHostId && operation.hostId === localHostId
          ? operation
          : withoutForeignRevision(operation)),
        sequence: state.lastSequence + 1,
      });
      projected.push(operation);
    } catch (error) {
      const key = replicationOperationKey(operation);
      conflicts.push({
        id: conflictId('TASK_REPLICATION_ORDER_CONFLICT', [key], operationTaskId(operation)),
        code: 'TASK_REPLICATION_ORDER_CONFLICT',
        taskId: operationTaskId(operation),
        operationKeys: [key],
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const uniqueConflicts = new Map(conflicts.map((item) => [item.id, item]));
  return {
    projection: {
      ...state,
      generatedAt: new Date(0).toISOString(),
    },
    operations: deduped.operations.sort(compareOperationIdentity),
    conflicts: [...uniqueConflicts.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function taskProjectionHash(projection: TaskProjection): string {
  return sha256(
    stableStringify({
      version: projection.version,
      projectId: projection.projectId,
      tasks: projection.tasks,
    })
  );
}
