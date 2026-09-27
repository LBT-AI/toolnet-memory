import type { StorageProvider } from '../../storage/types.js';

import { PersistentCodeManifestStore } from '../../storage/code-manifest-store.js';

import type { RepositoryScanOptions } from '../indexer/repository-scanner.js';

import { searchableParserExtensions } from '../parsers/capabilities.js';

import { buildManifest } from '../incremental/manifest-builder.js';

import { diffManifest, type CodeManifest } from '../incremental/manifest.js';

import { assertPathsWithinRoot, normalizeCoveragePaths, pathInScope } from './paths.js';

export interface FreshnessCheckResult {
  checked: boolean;
  stale: boolean;
  added: string[];
  modified: string[];
  deleted: string[];
  /*
   * Set when freshness could not be verified.
   * Verification failure must never be treated as clean.
   */
  error?: string;
}

export interface FreshnessCheckOptions {
  paths?: string[];
  signal?: AbortSignal;
  scan?: RepositoryScanOptions;
}

function failure(error: string): FreshnessCheckResult {
  return {
    checked: true,
    stale: true,
    added: [],
    modified: [],
    deleted: [],
    error,
  };
}

/*
 * Phase 68 freshness reuses the existing CodeManifest (per-file SHA-256)
 * and diffManifest() for added/modified/deleted detection.
 *
 * No second fingerprint system is introduced.
 *
 * The current manifest is built with the same searchable extension scope
 * as the index, so lexical-only languages are covered too.
 */
export class GraphFreshnessChecker {
  constructor(private readonly storage: StorageProvider) {}

  async check(
    projectId: string,
    rootPath: string,
    options: FreshnessCheckOptions = {}
  ): Promise<FreshnessCheckResult> {
    if (options.paths?.length) {
      assertPathsWithinRoot(rootPath, options.paths);
    }

    const manifestStore = new PersistentCodeManifestStore(this.storage);

    let previous: CodeManifest | null;

    try {
      previous = await manifestStore.load(projectId);
    } catch (error) {
      return failure(
        error instanceof Error ? `manifest unreadable: ${error.message}` : 'manifest unreadable'
      );
    }

    if (!previous) {
      /*
       * No manifest means the index predates manifest persistence
       * (or storage lost it). Cleanliness cannot be proven.
       */
      return failure('manifest missing: re-index to persist freshness baseline');
    }

    let current: CodeManifest;

    try {
      current = await buildManifest(projectId, rootPath, {
        scan: {
          ...options.scan,
          extensions: searchableParserExtensions(),
        },
        signal: options.signal,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? `manifest build failed: ${error.message}` : 'manifest build failed'
      );
    }

    const diff = diffManifest(previous, current);

    const paths = options.paths?.length ? normalizeCoveragePaths(rootPath, options.paths) : [];

    const inScope = (value: string): boolean => pathInScope(paths, [value]);

    const added = diff.added.filter(inScope);

    const modified = diff.modified.filter(inScope);

    const deleted = diff.deleted.filter(inScope);

    const stale = added.length > 0 || modified.length > 0 || deleted.length > 0;

    return {
      checked: true,
      stale,
      added,
      modified,
      deleted,
    };
  }
}
