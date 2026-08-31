import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
} from '../storage/index.js';

import { ToolNetMemoryRuntime } from './toolnet-memory-runtime.js';

export function createToolNetMemoryRuntime(rootPath: string = process.cwd()) {
  const config = loadConfig();

  const project = new ProjectManager().detect(rootPath);

  const rawStorage = createStorageProvider({
    provider: config.storage.provider,
    r2: config.storage.r2,
    s3: config.storage.s3,
    huggingface: config.storage.huggingface,
    localRoot: config.storage.localRoot,
  });

  const retryStorage = withStorageRetry(rawStorage, {
    attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3),
  });

  const storage = new ProjectScopedStorageProvider(
    retryStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  return new ToolNetMemoryRuntime({
    project,
    storage,
  });
}
