import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../../core/index.js";

import {
  createStorageProvider,
  withStorageRetry,
} from "../index.js";

import {
  sanitizeProjectFolder,
} from "./folder.js";

async function main() {
  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect();

  const storage =
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

  const folder =
    sanitizeProjectFolder(
      project.name,
    );

  const oldPrefix =
    `projects/${project.id}`;

  const newPrefix =
    `projects/${folder}`;

  if (
    oldPrefix ===
    newPrefix
  ) {
    console.log({
      ok: true,
      migrated: 0,
      folder,
      message:
        "Already using named project folder",
    });

    return;
  }

  const objects =
    await storage.list(
      oldPrefix,
    );

  let migrated = 0;

  for (
    const object
    of objects
  ) {
    const data =
      await storage.get(
        object.key,
      );

    if (!data) {
      continue;
    }

    const newKey =
      newPrefix +
      object.key.slice(
        oldPrefix.length,
      );

    await storage.put(
      newKey,
      data,
      "application/json",
    );

    migrated++;
  }

  /*
   * Project metadata dễ đọc.
   */
  await storage.put(
    `${newPrefix}/project.json`,

    JSON.stringify(
      {
        version: 1,

        projectId:
          project.id,

        projectName:
          project.name,

        storageFolder:
          folder,

        migratedAt:
          new Date()
            .toISOString(),
      },
      null,
      2,
    ),

    "application/json",
  );

  /*
   * Chỉ xoá folder hash sau khi copy xong.
   */
  if (
    migrated > 0
  ) {
    for (
      const object
      of objects
    ) {
      await storage.delete(
        object.key,
      );
    }
  }

  console.log({
    ok: true,

    project:
      project.name,

    projectId:
      project.id,

    folder,

    migrated,

    from:
      oldPrefix,

    to:
      newPrefix,
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
