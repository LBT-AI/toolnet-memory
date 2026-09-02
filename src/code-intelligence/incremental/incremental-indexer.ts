import type { StorageProvider } from '../../storage/types.js';

import { PersistentCodeGraphStore } from '../../storage/code-graph-store.js';

import { PersistentCodeManifestStore } from '../../storage/code-manifest-store.js';

import type { CodeGraphSnapshot, ParsedFile } from '../types.js';

import { GraphBuilder } from '../graph/graph-builder.js';

import { repairPreservedEdges } from '../graph/graph-repair.js';

import { parseTypeScriptFile } from '../parsers/typescript-parser.js';

import { TypeScriptModulePathResolver } from '../resolution/typescript-module-resolver.js';

import {
  DEFAULT_HASH_CONCURRENCY,
  DEFAULT_PARSE_CONCURRENCY,
  mapWithConcurrency,
} from '../indexer/bounded-concurrency.js';

import type { RepositoryScanOptions } from '../indexer/repository-scanner.js';

import { buildManifest } from './manifest-builder.js';

import { diffManifest } from './manifest.js';

export interface IncrementalIndexProgress {
  phase: 'hash' | 'parse' | 'repair' | 'save';
  current: number;
  total: number;
  file?: string;
}

export interface IncrementalIndexOptions {
  hashConcurrency?: number;
  parseConcurrency?: number;
  scan?: RepositoryScanOptions;
  signal?: AbortSignal;
  onProgress?: (event: IncrementalIndexProgress) => void;
}

export interface IncrementalIndexResult {
  firstRun: boolean;
  scanned: number;
  parsed: number;
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  unchanged: number;
  symbols: number;
  edges: number;
  repairedEdges: number;
  fullRebuild: boolean;
  saved: boolean;
}

function cleanPath(value: string): string {
  return value.replaceAll('\\', '/');
}

export class IncrementalRepositoryIndexer {
  constructor(private readonly storage: StorageProvider) {}

  async index(
    projectId: string,
    rootPath: string,
    options: IncrementalIndexOptions = {}
  ): Promise<IncrementalIndexResult> {
    const manifestStore = new PersistentCodeManifestStore(this.storage);

    const graphStore = new PersistentCodeGraphStore(this.storage);

    const previousManifest = await manifestStore.load(projectId);

    const previousGraph = await graphStore.load(projectId);

    const currentManifest = await buildManifest(projectId, rootPath, {
      concurrency: options.hashConcurrency ?? DEFAULT_HASH_CONCURRENCY,
      scan: options.scan,
      signal: options.signal,
      onProgress: ({ completed, total, file }) => {
        options.onProgress?.({
          phase: 'hash',
          current: completed,
          total,
          file,
        });
      },
    });

    const diff = diffManifest(previousManifest, currentManifest);

    const structuralChange =
      diff.added.length > 0 || diff.deleted.length > 0 || diff.renamed.length > 0;

    /*
     * File-set changes can make previously unresolved
     * imports/calls valid or invalidate global fallback.
     *
     * Correctness-first:
     * rebuild all graph relations for add/delete/rename.
     */
    const fullRebuild = previousGraph === null || structuralChange;

    const parseTargets = fullRebuild
      ? Object.keys(currentManifest.files).sort()
      : [...diff.modified];

    if (previousManifest && previousGraph && parseTargets.length === 0) {
      return {
        firstRun: false,
        scanned: Object.keys(currentManifest.files).length,
        parsed: 0,
        added: 0,
        modified: 0,
        deleted: 0,
        renamed: 0,
        unchanged: diff.unchanged.length,
        symbols: previousGraph.symbols.length,
        edges: previousGraph.edges.length,
        repairedEdges: 0,
        fullRebuild: false,
        saved: false,
      };
    }

    const parsed = await mapWithConcurrency(
      parseTargets,
      async (filePath): Promise<ParsedFile> => parseTypeScriptFile(projectId, rootPath, filePath),
      {
        concurrency: options.parseConcurrency ?? DEFAULT_PARSE_CONCURRENCY,
        signal: options.signal,
        onProgress: ({ completed, total, index }) => {
          options.onProgress?.({
            phase: 'parse',
            current: completed,
            total,
            file: parseTargets[index],
          });
        },
      }
    );

    const moduleResolver = new TypeScriptModulePathResolver(rootPath);

    let finalGraph;
    let repairedEdges = 0;

    if (fullRebuild || !previousGraph) {
      finalGraph = new GraphBuilder().build(projectId, parsed, {
        resolveModule: (fromFile, source, availableFiles) =>
          moduleResolver.resolve(fromFile, source, availableFiles),
      });
    } else {
      const modifiedFiles = new Set(diff.modified.map(cleanPath));

      const preservedSymbols = previousGraph.symbols.filter(
        (symbol) => !modifiedFiles.has(cleanPath(symbol.filePath))
      );

      finalGraph = new GraphBuilder().build(projectId, parsed, {
        seedSymbols: preservedSymbols,
        resolveModule: (fromFile, source, availableFiles) =>
          moduleResolver.resolve(fromFile, source, availableFiles),
      });

      options.onProgress?.({
        phase: 'repair',
        current: 0,
        total: previousGraph.edges.length,
      });

      const repaired = repairPreservedEdges({
        projectId,
        previousSymbols: previousGraph.symbols,
        previousEdges: previousGraph.edges,
        currentSymbols: finalGraph.allSymbols(projectId),
        rebuiltSourceFiles: modifiedFiles,
        removedFiles: new Set(),
      });

      for (const edge of repaired) {
        finalGraph.addEdge(edge);
      }

      repairedEdges = repaired.length;

      options.onProgress?.({
        phase: 'repair',
        current: previousGraph.edges.length,
        total: previousGraph.edges.length,
      });
    }

    const symbols = finalGraph.allSymbols(projectId);

    const symbolIds = new Set(symbols.map((symbol) => symbol.id));

    /*
     * Final dangling-edge invariant.
     */
    const edges = finalGraph
      .allEdges(projectId)
      .filter((edge) => symbolIds.has(edge.from) && symbolIds.has(edge.to));

    const snapshot: CodeGraphSnapshot = {
      version: 1,
      projectId,
      updatedAt: new Date().toISOString(),
      files: Object.keys(currentManifest.files).length,
      symbols,
      edges,
    };

    options.onProgress?.({
      phase: 'save',
      current: 0,
      total: 2,
    });

    await graphStore.save(snapshot);

    options.onProgress?.({
      phase: 'save',
      current: 1,
      total: 2,
    });

    await manifestStore.save(currentManifest);

    options.onProgress?.({
      phase: 'save',
      current: 2,
      total: 2,
    });

    return {
      firstRun: previousManifest === null,
      scanned: Object.keys(currentManifest.files).length,
      parsed: parseTargets.length,
      added: diff.added.length,
      modified: diff.modified.length,
      deleted: diff.deleted.length,
      renamed: diff.renamed.length,
      unchanged: diff.unchanged.length,
      symbols: snapshot.symbols.length,
      edges: snapshot.edges.length,
      repairedEdges,
      fullRebuild,
      saved: true,
    };
  }
}
