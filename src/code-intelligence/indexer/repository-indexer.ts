import type { ParsedFile } from '../types.js';

import { GraphBuilder } from '../graph/graph-builder.js';

import { parseCodeFile } from '../parsers/parse-code-file.js';
import { searchableParserExtensions } from '../parsers/capabilities.js';

import { DEFAULT_PARSE_CONCURRENCY, mapWithConcurrency } from './bounded-concurrency.js';

import {
  scanRepositoryDetailed,
  type RepositoryScanOptions,
  type RepositoryScanStats,
} from './repository-scanner.js';

export interface RepositoryIndexResult {
  files: number;
  symbols: number;
  edges: number;
  parseFailures: number;
  scan: RepositoryScanStats;
  graph: ReturnType<GraphBuilder['build']>;
}

export interface RepositoryIndexProgress {
  phase: 'scan' | 'parse';
  current: number;
  total: number;
  file?: string;
}

export interface RepositoryIndexOptions {
  onProgress?: (event: RepositoryIndexProgress) => void;
  concurrency?: number;
  maxWarnings?: number;
  scan?: RepositoryScanOptions;
  signal?: AbortSignal;
}

export class RepositoryIndexer {
  async index(
    projectId: string,
    rootPath: string,
    options: RepositoryIndexOptions = {}
  ): Promise<RepositoryIndexResult> {
    const scanOptions: RepositoryScanOptions = {
      ...options.scan,
      extensions: options.scan?.extensions ?? searchableParserExtensions(),
    };

    if (options.signal) {
      scanOptions.signal = options.signal;
    }

    const scan = await scanRepositoryDetailed(rootPath, scanOptions);

    const files = scan.files;

    options.onProgress?.({
      phase: 'scan',
      current: files.length,
      total: files.length,
    });

    const maxWarnings = options.maxWarnings ?? 20;

    if (!Number.isSafeInteger(maxWarnings) || maxWarnings < 0) {
      throw new Error('maxWarnings must be a non-negative integer');
    }

    let parseFailures = 0;

    const parsedResults = await mapWithConcurrency(
      files,
      async (file): Promise<ParsedFile | null> => {
        try {
          return await parseCodeFile(projectId, rootPath, file);
        } catch (error) {
          parseFailures += 1;

          if (parseFailures <= maxWarnings) {
            console.warn(
              `[indexer] skipped ${file}:`,
              error instanceof Error ? error.message : error
            );
          }

          return null;
        }
      },
      {
        concurrency: options.concurrency ?? DEFAULT_PARSE_CONCURRENCY,
        signal: options.signal,
        onProgress: ({ completed, total, index }) => {
          options.onProgress?.({
            phase: 'parse',
            current: completed,
            total,
            file: files[index],
          });
        },
      }
    );

    if (parseFailures > maxWarnings) {
      console.warn(`[indexer] ${parseFailures - maxWarnings} additional parse warnings suppressed`);
    }

    const parsed = parsedResults.filter((value): value is ParsedFile => value !== null);

    const graph = new GraphBuilder().build(projectId, parsed);

    return {
      files: parsed.length,
      symbols: graph.allSymbols(projectId).length,
      edges: graph.allEdges(projectId).length,
      parseFailures,
      scan: scan.stats,
      graph,
    };
  }
}
