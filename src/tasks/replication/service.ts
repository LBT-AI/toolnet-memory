import { hostname } from 'node:os';
import type { ProjectManifest } from '../../core/types.js';
import { readTaskOperations, taskOperationLogPath } from '../operation-log.js';
import { taskRecords } from '../projection.js';
import type { TaskProjection } from '../types.js';
import { convergeTaskOperations, taskProjectionHash } from './core.js';
import { downloadTaskOperations } from './download.js';
import { readAllReplicatedTaskOperations, readTaskReplicationCursor } from './store.js';
import type {
  TaskReplicationConflict,
  TaskReplicationStatus,
  TaskReplicationSyncResult,
} from './types.js';
import { uploadTaskOperations } from './upload.js';
import type { StorageProvider } from '../../storage/types.js';

export interface TaskReplicationServiceOptions {
  hostId?: string;
  enabled?: boolean;
}

export function taskReplicationHostId(explicit?: string): string {
  const value = explicit ?? process.env.TOOLNET_HOST_ID ?? hostname();
  const normalized = value.trim();
  return normalized || `pid-${process.pid}`;
}

function enabledFromEnvironment(): boolean {
  return process.env.TOOLNET_TASK_REPLICATION !== '0';
}

export class TaskReplicationService {
  readonly hostId: string;
  readonly enabled: boolean;
  private lastConflicts: TaskReplicationConflict[] = [];
  private lastError?: string;

  constructor(
    private readonly project: Pick<ProjectManifest, 'id' | 'rootPath'>,
    private readonly storage: StorageProvider,
    options: TaskReplicationServiceOptions = {}
  ) {
    this.hostId = taskReplicationHostId(options.hostId);
    this.enabled = options.enabled ?? enabledFromEnvironment();
  }

  authoredOperations() {
    return readTaskOperations(taskOperationLogPath(this.project), { repairCorruptTail: false });
  }

  converged(): { projection: TaskProjection; conflicts: TaskReplicationConflict[] } {
    const result = convergeTaskOperations(
      this.project.id,
      [...this.authoredOperations(), ...readAllReplicatedTaskOperations(this.project)],
      this.hostId
    );
    this.lastConflicts = result.conflicts;
    return {
      projection: result.projection,
      conflicts: result.conflicts,
    };
  }

  listTasks() {
    return taskRecords(this.converged().projection);
  }

  projection(): TaskProjection {
    return this.converged().projection;
  }

  async push(): Promise<TaskReplicationSyncResult> {
    if (!this.enabled) {
      return {
        pushedBatches: 0,
        pushedOperations: 0,
        pulledBatches: 0,
        pulledOperations: 0,
        conflicts: 0,
      };
    }
    try {
      const result = await uploadTaskOperations(this.project, this.storage, this.hostId);
      this.lastError = undefined;
      return {
        pushedBatches: result.batches,
        pushedOperations: result.operations,
        pulledBatches: 0,
        pulledOperations: 0,
        conflicts: this.lastConflicts.length,
      };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return {
        pushedBatches: 0,
        pushedOperations: 0,
        pulledBatches: 0,
        pulledOperations: 0,
        conflicts: this.lastConflicts.length,
      };
    }
  }

  async pull(): Promise<TaskReplicationSyncResult> {
    if (!this.enabled) {
      return {
        pushedBatches: 0,
        pushedOperations: 0,
        pulledBatches: 0,
        pulledOperations: 0,
        conflicts: 0,
      };
    }
    try {
      const result = await downloadTaskOperations(this.project, this.storage, this.hostId);
      this.lastError = undefined;
      this.converged();
      return {
        pushedBatches: 0,
        pushedOperations: 0,
        pulledBatches: result.batches,
        pulledOperations: result.operations,
        conflicts: result.conflicts + this.lastConflicts.length,
      };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return {
        pushedBatches: 0,
        pushedOperations: 0,
        pulledBatches: 0,
        pulledOperations: 0,
        conflicts: this.lastConflicts.length,
      };
    }
  }

  async sync(): Promise<TaskReplicationSyncResult> {
    const pushed = await this.push();
    const pulled = await this.pull();
    return {
      pushedBatches: pushed.pushedBatches,
      pushedOperations: pushed.pushedOperations,
      pulledBatches: pulled.pulledBatches,
      pulledOperations: pulled.pulledOperations,
      conflicts: pulled.conflicts,
    };
  }

  status(): TaskReplicationStatus {
    const authored = this.authoredOperations();
    const cursor = readTaskReplicationCursor(this.project, this.hostId);
    const all = readAllReplicatedTaskOperations(this.project);
    const convergence = this.converged();
    return {
      enabled: this.enabled,
      hostId: this.hostId,
      localAuthoredOperations: authored.length,
      uploadedLocalSequence: cursor.uploadedLocalSequence,
      replicatedHosts: [...new Set(all.map((operation) => operation.hostId))].sort(),
      replicatedOperations: all.length,
      conflicts: convergence.conflicts.length,
      ...(cursor.lastPushAt ? { lastPushAt: cursor.lastPushAt } : {}),
      ...(cursor.lastPullAt ? { lastPullAt: cursor.lastPullAt } : {}),
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }

  projectionHash(): string {
    return taskProjectionHash(this.projection());
  }
}
