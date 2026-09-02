import { lstat, readdir } from 'node:fs/promises';

import { extname, join, relative, resolve } from 'node:path';

import { isSensitiveFile } from '../../security/file-filter.js';

export const DEFAULT_MAX_CODE_FILE_BYTES = 2 * 1024 * 1024;

export const DEFAULT_CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);

export const DEFAULT_IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.toolnet',
  '.toolnet-memory',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'vendor',
  'target',
]);

export interface RepositoryScanProgress {
  directories: number;
  entries: number;
  accepted: number;
}

export interface RepositoryScanStats {
  directories: number;
  entries: number;
  accepted: number;
  skippedIgnoredDirectories: number;
  skippedSymlinks: number;
  skippedGenerated: number;
  skippedSensitive: number;
  skippedOversized: number;
  skippedUnreadable: number;
}

export interface RepositoryScanResult {
  files: string[];
  stats: RepositoryScanStats;
}

export interface RepositoryScanOptions {
  maxFileBytes?: number;
  maxFiles?: number;
  extensions?: Iterable<string>;
  extraIgnoredDirectories?: Iterable<string>;
  signal?: AbortSignal;
  progressInterval?: number;
  onProgress?: (progress: RepositoryScanProgress) => void;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error('Repository scan aborted');
  }
}

function normalizedExtension(extension: string): string {
  const value = extension.trim().toLowerCase();

  if (!value) {
    throw new Error('Repository scan extension cannot be empty');
  }

  return value.startsWith('.') ? value : `.${value}`;
}

function generatedFile(fileName: string): boolean {
  const value = fileName.toLowerCase();

  return /\.min\.(?:js|mjs|cjs)$/u.test(value) || /\.bundle\.(?:js|mjs|cjs)$/u.test(value);
}

function portablePath(value: string): string {
  return value.replaceAll('\\', '/');
}

export async function scanRepositoryDetailed(
  rootPath: string,
  options: RepositoryScanOptions = {}
): Promise<RepositoryScanResult> {
  const root = resolve(rootPath);

  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_CODE_FILE_BYTES;

  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1) {
    throw new Error('maxFileBytes must be a positive integer');
  }

  const maxFiles = options.maxFiles ?? Number.MAX_SAFE_INTEGER;

  positiveInteger(maxFiles, 'maxFiles');

  const progressInterval = options.progressInterval ?? 1_000;

  positiveInteger(progressInterval, 'progressInterval');

  const extensions = new Set(
    options.extensions ? [...options.extensions].map(normalizedExtension) : DEFAULT_CODE_EXTENSIONS
  );

  const ignored = new Set(DEFAULT_IGNORED_DIRECTORIES);

  for (const directory of options.extraIgnoredDirectories ?? []) {
    const normalized = directory.trim();

    if (normalized) {
      ignored.add(normalized);
    }
  }

  const files: string[] = [];

  const stats: RepositoryScanStats = {
    directories: 0,
    entries: 0,
    accepted: 0,
    skippedIgnoredDirectories: 0,
    skippedSymlinks: 0,
    skippedGenerated: 0,
    skippedSensitive: 0,
    skippedOversized: 0,
    skippedUnreadable: 0,
  };

  /*
   * Iterative directory walk avoids recursive call-stack
   * growth on extremely deep repositories.
   */
  const directories = [root];

  while (directories.length > 0) {
    throwIfAborted(options.signal);

    const directory = directories.pop()!;

    let entries;
    try {
      entries = await readdir(directory, {
        withFileTypes: true,
      });
    } catch {
      stats.skippedUnreadable += 1;
      continue;
    }

    stats.directories += 1;

    for (const entry of entries) {
      throwIfAborted(options.signal);

      stats.entries += 1;

      if (stats.entries % progressInterval === 0) {
        options.onProgress?.({
          directories: stats.directories,
          entries: stats.entries,
          accepted: stats.accepted,
        });
      }

      const full = join(directory, entry.name);

      /*
       * Never traverse or index symlinks.
       *
       * This prevents directory loops and prevents indexing
       * files outside the requested repository root.
       */
      if (entry.isSymbolicLink()) {
        stats.skippedSymlinks += 1;
        continue;
      }

      if (entry.isDirectory()) {
        if (ignored.has(entry.name)) {
          stats.skippedIgnoredDirectories += 1;
          continue;
        }

        directories.push(full);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = extname(entry.name).toLowerCase();

      if (!extensions.has(extension)) {
        continue;
      }

      if (generatedFile(entry.name)) {
        stats.skippedGenerated += 1;
        continue;
      }

      if (isSensitiveFile(full)) {
        stats.skippedSensitive += 1;
        continue;
      }

      let fileStats;
      try {
        fileStats = await lstat(full);
      } catch {
        stats.skippedUnreadable += 1;
        continue;
      }

      /*
       * Revalidate after lstat in case filesystem state
       * changed between readdir and inspection.
       */
      if (fileStats.isSymbolicLink()) {
        stats.skippedSymlinks += 1;
        continue;
      }

      if (!fileStats.isFile()) {
        continue;
      }

      if (fileStats.size > maxFileBytes) {
        stats.skippedOversized += 1;
        continue;
      }

      if (files.length >= maxFiles) {
        throw new Error(`Repository scan file limit exceeded: ${maxFiles}`);
      }

      files.push(portablePath(relative(root, full)));

      stats.accepted += 1;
    }
  }

  files.sort();

  options.onProgress?.({
    directories: stats.directories,
    entries: stats.entries,
    accepted: stats.accepted,
  });

  return {
    files,
    stats,
  };
}

export async function scanRepository(
  rootPath: string,
  options: RepositoryScanOptions = {}
): Promise<string[]> {
  return (await scanRepositoryDetailed(rootPath, options)).files;
}
