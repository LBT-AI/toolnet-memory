import type { ProjectManifest } from '../core/types.js';
import type { NativeTaskMirrorRuntime } from './native-plan/runtime.js';
import type { SessionWal } from './wal.js';

export interface SessionTaskSelfHealingResult {
  projectionRecovered: boolean;
  replayedEvents: number;
  mirrorCompletedBatchesBefore: number;
  mirrorCompletedBatchesAfter: number;
  mirrorFailedBatchesBefore: number;
  mirrorFailedBatchesAfter: number;
  errors: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Repair derived Task state from the authoritative Task log and Session WAL. */
export async function recoverSessionTaskState(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  wal: SessionWal,
  mirror: NativeTaskMirrorRuntime
): Promise<SessionTaskSelfHealingResult> {
  const errors: string[] = [];
  let projectionRecovered = false;
  let replayedEvents = 0;
  const before = mirror.status();

  try {
    mirror.store().rebuildProjection();
    projectionRecovered = true;
  } catch (error) {
    errors.push(`TASK_PROJECTION_RECOVERY_FAILED ${errorMessage(error)}`);
  }

  try {
    const events = wal.readAllEvents();
    replayedEvents = events.length;
    mirror.enqueue(events);
    await mirror.drain();
  } catch (error) {
    errors.push(`TASK_MIRROR_WAL_REPLAY_FAILED ${errorMessage(error)}`);
  }

  const after = mirror.status();
  if (after.failedBatches > before.failedBatches) {
    errors.push(`TASK_MIRROR_REPLAY_BATCH_FAILED ${after.lastError ?? 'unknown-error'}`);
  }

  return {
    projectionRecovered,
    replayedEvents,
    mirrorCompletedBatchesBefore: before.completedBatches,
    mirrorCompletedBatchesAfter: after.completedBatches,
    mirrorFailedBatchesBefore: before.failedBatches,
    mirrorFailedBatchesAfter: after.failedBatches,
    errors,
  };
}
