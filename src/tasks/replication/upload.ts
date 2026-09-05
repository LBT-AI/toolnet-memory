import { readTaskOperations, taskOperationLogPath } from '../operation-log.js';
import type { ProjectManifest } from '../../core/types.js';
import type { StorageProvider } from '../../storage/types.js';
import {
  createTaskReplicationBatch,
  operationsDigest,
  taskReplicationBatchKey,
  validateTaskReplicationBatch,
  TASK_REPLICATION_MAX_OPERATIONS,
} from './core.js';
import { readTaskReplicationCursor, writeTaskReplicationCursor } from './store.js';
import type { TaskOperation } from '../types.js';
import type { TaskReplicationBatch, TaskReplicationCursor } from './types.js';

function operationBatch(
  operations: TaskOperation[],
  hostId: string,
  projectId: string
): TaskReplicationBatch {
  return createTaskReplicationBatch(projectId, hostId, operations, new Date().toISOString());
}

async function putImmutable(
  storage: StorageProvider,
  key: string,
  batch: TaskReplicationBatch
): Promise<void> {
  const payload = `${JSON.stringify(batch, null, 2)}\n`;
  const existing = await storage.getText(key);
  if (existing !== null) {
    const parsed = validateTaskReplicationBatch(JSON.parse(existing), batch.projectId);
    if (parsed.operationsSha256 !== batch.operationsSha256) {
      throw new Error('TASK_REPLICATION_IMMUTABLE_CONFLICT');
    }
    return;
  }
  await storage.put(key, payload, 'application/json');
  const written = await storage.getText(key);
  if (written === null) {
    throw new Error('TASK_REPLICATION_WRITE_NOT_VISIBLE');
  }
  const verified = validateTaskReplicationBatch(JSON.parse(written), batch.projectId);
  if (verified.operationsSha256 !== operationsDigest(batch.operations)) {
    throw new Error('TASK_REPLICATION_HASH_MISMATCH');
  }
}

export interface TaskReplicationUploadResult {
  batches: number;
  operations: number;
  cursor: TaskReplicationCursor;
}

export async function uploadTaskOperations(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  storage: StorageProvider,
  hostId: string,
  batchSize = TASK_REPLICATION_MAX_OPERATIONS
): Promise<TaskReplicationUploadResult> {
  const cursor = readTaskReplicationCursor(project, hostId);
  const operations = readTaskOperations(taskOperationLogPath(project), { repairCorruptTail: false })
    .filter((operation) => operation.hostId === hostId)
    .filter((operation) => operation.sequence > cursor.uploadedLocalSequence)
    .sort((left, right) => left.sequence - right.sequence);
  const boundedBatchSize = Math.max(
    1,
    Math.min(TASK_REPLICATION_MAX_OPERATIONS, Math.trunc(batchSize))
  );
  let pushedOperations = 0;
  let pushedBatches = 0;
  let uploadedThrough = cursor.uploadedLocalSequence;
  for (let index = 0; index < operations.length; index += boundedBatchSize) {
    const batchOperations = operations.slice(index, index + boundedBatchSize);
    const batch = operationBatch(batchOperations, hostId, project.id);
    await putImmutable(storage, taskReplicationBatchKey(batch), batch);
    uploadedThrough = Math.max(uploadedThrough, batch.lastLocalSequence);
    pushedOperations += batch.operations.length;
    pushedBatches += 1;
    writeTaskReplicationCursor(project, {
      ...cursor,
      uploadedLocalSequence: uploadedThrough,
      lastPushAt: new Date().toISOString(),
      lastError: undefined,
    });
  }
  const next = readTaskReplicationCursor(project, hostId);
  return {
    batches: pushedBatches,
    operations: pushedOperations,
    cursor: next,
  };
}
