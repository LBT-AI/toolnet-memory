import type { ProjectManifest } from '../../core/types.js';
import type { StorageProvider } from '../../storage/types.js';
import { projectLocalWorkStateWithTasks } from '../../work-continuity/task-compatibility.js';
import { TaskReplicationService } from './service.js';
import type { TaskReplicationStatus, TaskReplicationSyncResult } from './types.js';

export interface TaskReplicationRuntimeStatus extends TaskReplicationStatus {
  queuedBatches: number;
  completedBatches: number;
  failedBatches: number;
}

export class TaskReplicationRuntime {
  private readonly service: TaskReplicationService;
  private tail: Promise<void> = Promise.resolve();
  private queuedBatches = 0;
  private completedBatches = 0;
  private failedBatches = 0;
  private lastResult?: TaskReplicationSyncResult;

  constructor(
    private readonly project: Pick<ProjectManifest, 'id' | 'name' | 'rootPath'>,
    storage: StorageProvider,
    options: { hostId?: string; enabled?: boolean } = {}
  ) {
    this.service = new TaskReplicationService(project, storage, options);
  }

  enqueue(): void {
    if (!this.service.enabled) {
      return;
    }
    this.queuedBatches += 1;
    this.tail = this.tail.then(async () => {
      try {
        this.lastResult = await this.service.sync();
        projectLocalWorkStateWithTasks(this.project as ProjectManifest);
        this.completedBatches += 1;
      } catch {
        this.failedBatches += 1;
      }
    });
  }

  async drain(): Promise<void> {
    await this.tail;
  }

  async sync(): Promise<TaskReplicationSyncResult> {
    if (!this.service.enabled) {
      return {
        pushedBatches: 0,
        pushedOperations: 0,
        pulledBatches: 0,
        pulledOperations: 0,
        conflicts: 0,
      };
    }
    this.enqueue();
    await this.drain();
    return (
      this.lastResult ?? {
        pushedBatches: 0,
        pushedOperations: 0,
        pulledBatches: 0,
        pulledOperations: 0,
        conflicts: 0,
      }
    );
  }

  projection() {
    return this.service.projection();
  }

  listTasks() {
    return this.service.listTasks();
  }

  status(): TaskReplicationRuntimeStatus {
    return {
      ...this.service.status(),
      queuedBatches: this.queuedBatches,
      completedBatches: this.completedBatches,
      failedBatches: this.failedBatches,
    };
  }
}
