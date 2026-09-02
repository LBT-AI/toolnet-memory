import { join } from 'node:path';

import { scanRepository, type RepositoryScanOptions } from '../indexer/repository-scanner.js';

import { DEFAULT_HASH_CONCURRENCY, mapWithConcurrency } from '../indexer/bounded-concurrency.js';

import { hashFile } from './file-hash.js';

import type { CodeManifest } from './manifest.js';

export interface BuildManifestProgress {
  completed: number;
  total: number;
  file: string;
}

export interface BuildManifestOptions {
  concurrency?: number;
  scan?: RepositoryScanOptions;
  signal?: AbortSignal;
  onProgress?: (event: BuildManifestProgress) => void;
}

export async function buildManifest(
  projectId: string,
  rootPath: string,
  options: BuildManifestOptions = {}
): Promise<CodeManifest> {
  const scanOptions: RepositoryScanOptions = {
    ...options.scan,
  };

  if (options.signal) {
    scanOptions.signal = options.signal;
  }

  const paths = await scanRepository(rootPath, scanOptions);

  const entries = await mapWithConcurrency(
    paths,
    async (path) => ({
      path,
      hash: await hashFile(join(rootPath, path)),
    }),
    {
      concurrency: options.concurrency ?? DEFAULT_HASH_CONCURRENCY,
      signal: options.signal,
      onProgress: ({ completed, total, index }) => {
        options.onProgress?.({
          completed,
          total,
          file: paths[index]!,
        });
      },
    }
  );

  const files: CodeManifest['files'] = {};

  for (const entry of entries) {
    files[entry.path] = {
      path: entry.path,
      hash: entry.hash,
    };
  }

  return {
    version: 1,
    projectId,
    updatedAt: new Date().toISOString(),
    files,
  };
}
