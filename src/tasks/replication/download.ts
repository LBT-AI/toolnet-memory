import type { ProjectManifest } from '../../core/types.js';
import type { StorageProvider } from '../../storage/types.js';
import { validateTaskReplicationBatch } from './core.js';
import {
  importReplicatedTaskOperation,
  readReplicatedTaskOperations,
  readTaskReplicationCursor,
  writeTaskReplicationCursor,
} from './store.js';
import type { TaskReplicationBatch, TaskReplicationCursor } from './types.js';

function prefix(projectId: string): string {
  return `projects/${encodeURIComponent(projectId)}/tasks/v1/hosts/`;
}

export interface TaskReplicationDownloadResult {
  batches: number;
  operations: number;
  conflicts: number;
  cursor: TaskReplicationCursor;
}

export async function downloadTaskOperations(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>,
  storage: StorageProvider,
  hostId: string
): Promise<TaskReplicationDownloadResult> {
  const cursor = readTaskReplicationCursor(project, hostId);
  const objects = await storage.list(prefix(project.id));
  let batches = 0;
  let operations = 0;
  let conflicts = 0;
  const nextCursors = { ...cursor.remoteHostCursors };
  for (const object of objects.sort((left, right) => left.key.localeCompare(right.key))) {
    if (!object.key.endsWith('.json') || object.key.endsWith('/project.json')) {
      continue;
    }
    const text = await storage.getText(object.key);
    if (!text) {
      conflicts += 1;
      continue;
    }
    let batch: TaskReplicationBatch;
    try {
      batch = validateTaskReplicationBatch(JSON.parse(text), project.id);
    } catch {
      conflicts += 1;
      continue;
    }
    if (batch.hostId === hostId) {
      nextCursors[batch.hostId] = Math.max(nextCursors[batch.hostId] ?? 0, batch.lastLocalSequence);
      continue;
    }
    const known = nextCursors[batch.hostId] ?? 0;
    if (batch.lastLocalSequence <= known) {
      continue;
    }
    batches += 1;
    for (const operation of batch.operations) {
      const result = importReplicatedTaskOperation(project, operation);
      if (result.collision) {
        conflicts += 1;
        continue;
      }
      if (result.imported) {
        operations += 1;
      }
    }
    const importedOperations = readReplicatedTaskOperations(project, batch.hostId);
    const bySequence = new Map(
      importedOperations.map((operation) => [operation.sequence, operation])
    );
    let contiguous = known;
    while (bySequence.has(contiguous + 1)) {
      contiguous += 1;
    }
    nextCursors[batch.hostId] = Math.max(known, contiguous);
  }
  const next = {
    ...cursor,
    remoteHostCursors: nextCursors,
    lastPullAt: new Date().toISOString(),
    lastError: undefined,
  };
  writeTaskReplicationCursor(project, next);
  return { batches, operations, conflicts, cursor: next };
}
