import type {
  StorageProvider,
} from "../storage/types.js";

import {
  SnapshotManager,
} from "../snapshot/index.js";

export async function restoreLatestSnapshot(
  storage:
    StorageProvider,

  projectId:
    string,
) {
  const manager =
    new SnapshotManager(
      storage,
    );

  const snapshots =
    await manager.list(
      projectId,
    );

  const latest =
    snapshots[0];

  if (!latest) {
    throw new Error(
      "No snapshot available",
    );
  }

  const result =
    await manager.restore(
      projectId,
      latest.id,
    );

  return {
    snapshot:
      latest.id,

    createdAt:
      latest.createdAt,

    ...result,
  };
}
