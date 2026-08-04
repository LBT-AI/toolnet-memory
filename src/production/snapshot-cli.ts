import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
} from "../storage/index.js";

import {
  SnapshotManager,
} from "../snapshot/index.js";

import {
  restoreLatestSnapshot,
} from "./recovery.js";

async function main() {
  const command =
    process.argv[2];

  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect();

  const rawStorage =
    withStorageRetry(
      createStorageProvider({
        provider:
          config.storage.provider,

        huggingface:
          config.storage.huggingface,

        localRoot:
          config.storage.localRoot,
      }),
      {
        attempts: 3,
      },
    );

  const storage =
    new ProjectScopedStorageProvider(
      rawStorage,
      project.id,
      project.name,
      project.remote ?? project.name,
    );

  const manager =
    new SnapshotManager(
      storage,
    );

  if (
    command === "list"
  ) {
    const list =
      await manager.list(
        project.id,
      );

    console.log(
      list.map(
        (snapshot) => ({
          id:
            snapshot.id,

          createdAt:
            snapshot.createdAt,

          reason:
            snapshot.reason,
        }),
      ),
    );

    return;
  }

  if (
    command === "create"
  ) {
    const reason =
      process.argv
        .slice(3)
        .join(" ") ||
      "manual-cli";

    console.log(
      await manager.create(
        project.id,
        reason,
      ),
    );

    return;
  }

  if (
    command === "restore"
  ) {
    const id =
      process.argv[3];

    if (!id) {
      throw new Error(
        "snapshot id required",
      );
    }

    await manager.create(
      project.id,
      "before-cli-restore",
    );

    console.log(
      await manager.restore(
        project.id,
        id,
      ),
    );

    return;
  }

  if (
    command ===
    "recover-latest"
  ) {
    console.log(
      await restoreLatestSnapshot(
        storage,
        project.id,
      ),
    );

    return;
  }

  throw new Error(
    "Usage: snapshot-cli list|create|restore|recover-latest",
  );
}

main().catch(
  (error) => {
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exit(1);
  },
);
