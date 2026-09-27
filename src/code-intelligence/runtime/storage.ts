/*
 * Phase 77 — shared storage access for runtime implementations.
 *
 * Reuses the existing storage abstraction and retry wrapper; the daemon never
 * introduces a second storage provider.
 */

import { loadConfig } from '../../core/config.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import type { StorageProvider } from '../../storage/types.js';

let cachedRoot: StorageProvider | undefined;

export function daemonRootStorage(): StorageProvider {
  if (cachedRoot) {
    return cachedRoot;
  }

  const config = loadConfig();

  cachedRoot = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3) }
  );

  return cachedRoot;
}

export function daemonProjectStorage(project: {
  id: string;
  name: string;
  remote?: string;
}): StorageProvider {
  return new ProjectScopedStorageProvider(
    daemonRootStorage(),
    project.id,
    project.name,
    project.remote ?? project.name
  );
}
