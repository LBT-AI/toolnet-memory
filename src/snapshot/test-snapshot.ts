import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
} from "../storage/index.js";

import {
  SnapshotManager,
} from "./manager.js";

async function main() {
  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect();

  const rawStorage =
    createStorageProvider({
      provider:
        config.storage.provider,

      huggingface:
        config.storage.huggingface,

      localRoot:
        config.storage.localRoot,
    });

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

  const created =
    await manager.create(
      project.id,
      "manual-test",
    );

  const list =
    await manager.list(
      project.id,
    );

  console.log({
    ok:
      Boolean(created),

    created:
      created?.id,

    snapshots:
      list.length,

    latest:
      list[0]?.id,
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
