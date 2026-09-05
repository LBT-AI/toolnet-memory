import type { ProjectManifest } from '../../core/types.js';
import { TaskStore } from '../../tasks/store.js';
import { createSessionIdentity } from '../identity.js';
import type { NormalizedSessionEvent } from '../types.js';
import { refreshLocalTaskCompatibility } from '../../work-continuity/task-compatibility.js';
import { syncNativeTaskMirrors } from './mutate.js';

export interface NativeTaskMirrorRuntimeStatus {
  enabled: boolean;
  queuedBatches: number;
  completedBatches: number;
  failedBatches: number;
  lastError?: string;
  lastCompletedAt?: string;
}

function enabledFromEnvironment(): boolean {
  return process.env.TOOLNET_TASK_MIRROR !== '0';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Derived, fail-soft consumer of the durable Session WAL.
 *
 * SessionCore calls enqueue only after WAL append succeeds. Task mirror work
 * is serialized per runtime so native plan updates are applied in order.
 */
export class NativeTaskMirrorRuntime {
  private readonly enabled: boolean;
  private readonly taskStore: TaskStore;
  private tail: Promise<void> = Promise.resolve();
  private queuedBatches = 0;
  private completedBatches = 0;
  private failedBatches = 0;
  private lastError?: string;
  private lastCompletedAt?: string;

  constructor(private readonly project: Pick<ProjectManifest, 'id' | 'rootPath'>) {
    this.enabled = enabledFromEnvironment();
    this.taskStore = new TaskStore(project);
  }

  enqueue(events: NormalizedSessionEvent[]): void {
    if (!this.enabled || events.length === 0) {
      return;
    }

    const batch = [...events];
    this.queuedBatches += 1;
    this.tail = this.tail.then(async () => {
      try {
        await syncNativeTaskMirrors(this.project, this.taskStore, batch);
        const latest = batch[batch.length - 1];
        if (latest) {
          const identity = createSessionIdentity(
            this.project as ProjectManifest,
            latest.agent,
            latest.nativeSessionId
          );
          refreshLocalTaskCompatibility(this.project as ProjectManifest, identity);
        }
        this.completedBatches += 1;
        this.lastCompletedAt = new Date().toISOString();
        delete this.lastError;
      } catch (error) {
        /*
         * Task mirroring is derived state. Never reject the queue or damage
         * session capture because a Task projection failed.
         */
        this.failedBatches += 1;
        this.lastError = errorMessage(error);
      }
    });
  }

  async drain(): Promise<void> {
    await this.tail;
  }

  status(): NativeTaskMirrorRuntimeStatus {
    return {
      enabled: this.enabled,
      queuedBatches: this.queuedBatches,
      completedBatches: this.completedBatches,
      failedBatches: this.failedBatches,
      ...(this.lastError ? { lastError: this.lastError } : {}),
      ...(this.lastCompletedAt ? { lastCompletedAt: this.lastCompletedAt } : {}),
    };
  }

  store(): TaskStore {
    return this.taskStore;
  }
}
