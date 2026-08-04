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
  ToolNetMemoryRuntime,
} from "./toolnet-memory-runtime.js";

export function createToolNetMemoryRuntime(
  rootPath: string =
    process.cwd(),
) {
  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect(rootPath);

  const rawStorage =
    createStorageProvider({
      provider:
        config.storage.provider,

      huggingface:
        config.storage.huggingface,

      localRoot:
        config.storage.localRoot,
    });

  const retryStorage =
    withStorageRetry(
      rawStorage,
      {
        attempts:
          Number(
            process.env
              .TOOLNET_STORAGE_RETRIES ??
            3,
          ),
      },
    );

  const storage =
    new ProjectScopedStorageProvider(
      retryStorage,
      project.id,
      project.name,
      project.remote ?? project.name,
    );

  const embeddingModel =
    process.env
      .HF_EMBEDDING_MODEL ??
    "sentence-transformers/all-MiniLM-L6-v2";

  return new ToolNetMemoryRuntime({
    project,
    storage,
    embeddingModel,
  });
}
