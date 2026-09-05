import type { TaskOperation, TaskProjection } from '../types.js';

export const TASK_REPLICATION_BATCH_VERSION = 1 as const;

export interface TaskReplicationBatch {
  version: typeof TASK_REPLICATION_BATCH_VERSION;
  projectId: string;
  hostId: string;
  batchId: string;
  firstLocalSequence: number;
  lastLocalSequence: number;
  operations: TaskOperation[];
  createdAt: string;
  operationsSha256: string;
}

export interface TaskReplicationCursor {
  version: 1;
  hostId: string;
  uploadedLocalSequence: number;
  remoteHostCursors: Record<string, number>;
  lastPushAt?: string;
  lastPullAt?: string;
  lastError?: string;
}

export interface TaskReplicationConflict {
  id: string;
  code:
    | 'TASK_REPLICATION_OPERATION_COLLISION'
    | 'TASK_LIFECYCLE_CONFLICT'
    | 'TASK_LEASE_CONFLICT'
    | 'TASK_COMPLETION_CONFLICT'
    | 'TASK_REPLICATION_GUARD_REJECTED'
    | 'TASK_REPLICATION_ORDER_CONFLICT';
  taskId?: string;
  operationKeys: string[];
  message: string;
}

export interface TaskConvergenceResult {
  projection: TaskProjection;
  operations: TaskOperation[];
  conflicts: TaskReplicationConflict[];
}

export interface TaskReplicationStatus {
  enabled: boolean;
  hostId: string;
  localAuthoredOperations: number;
  uploadedLocalSequence: number;
  replicatedHosts: string[];
  replicatedOperations: number;
  conflicts: number;
  lastPushAt?: string;
  lastPullAt?: string;
  lastError?: string;
}

export interface TaskReplicationSyncResult {
  pushedBatches: number;
  pushedOperations: number;
  pulledBatches: number;
  pulledOperations: number;
  conflicts: number;
}
