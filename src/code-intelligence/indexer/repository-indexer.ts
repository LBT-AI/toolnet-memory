import type { ParsedFile } from '../types.js';

import { scanRepository } from './repository-scanner.js';

import { parseTypeScriptFile } from '../parsers/typescript-parser.js';

import { GraphBuilder } from '../graph/graph-builder.js';

export interface RepositoryIndexResult {
  files: number;
  symbols: number;
  edges: number;

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
}

export class RepositoryIndexer {
  async index(
    projectId: string,
    rootPath: string,
    options: RepositoryIndexOptions = {}
  ): Promise<RepositoryIndexResult> {
    const files = await scanRepository(rootPath);

    options.onProgress?.({
      phase: 'scan',

      current: files.length,

      total: files.length,
    });

    const parsed: ParsedFile[] = [];

    let processed = 0;

    for (const file of files) {
      try {
        parsed.push(await parseTypeScriptFile(projectId, rootPath, file));
      } catch (error) {
        console.warn(`[indexer] skipped ${file}:`, error instanceof Error ? error.message : error);
      } finally {
        processed += 1;

        options.onProgress?.({
          phase: 'parse',

          current: processed,

          total: files.length,

          file,
        });
      }
    }

    const graph = new GraphBuilder().build(projectId, parsed);

    return {
      files: parsed.length,

      symbols: graph.allSymbols(projectId).length,

      edges: graph.allEdges(projectId).length,

      graph,
    };
  }
}
