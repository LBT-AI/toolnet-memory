import type { CodeGraphStore } from '../graph/graph-store.js';

import type { StorageProvider } from '../../storage/types.js';

import type { StageProgressCallback } from '../types.js';

import { PersistentCodeChunkStore } from '../../storage/code-chunk-store.js';

import { SmartCodeChunker } from '../chunks/smart-chunker.js';

import type { CodeChunk } from '../chunks/types.js';

import { CodeFtsIndex } from './code-fts.js';

import { codeSourceWeight } from './source-priority.js';

export interface SemanticCodeResult {
  chunk: CodeChunk;

  score: number;

  vectorScore: number;

  lexicalScore: number;
}

export interface CodeSemanticStats {
  chunks: number;

  vectorsLoaded: number;

  vectorsIndexed: number;

  vectorsRemoved: number;

  totalVectors: number;

  savedChunks: boolean;

  savedVectors: boolean;
}

export class SemanticCodeEngine {
  private readonly fts: CodeFtsIndex;

  constructor(
    private readonly options: {
      projectId: string;

      rootPath: string;

      storage: StorageProvider;

      graph: CodeGraphStore;
    }
  ) {
    this.fts = new CodeFtsIndex(options.projectId);
  }

  async initialize(onProgress?: StageProgressCallback): Promise<CodeSemanticStats> {
    const { projectId, rootPath, storage, graph } = this.options;

    const chunkStore = new PersistentCodeChunkStore(storage);

    const chunks = await new SmartCodeChunker().build(
      projectId,
      rootPath,
      graph.allSymbols(projectId)
    );

    const previousChunks = await chunkStore.load(projectId);

    const chunksChanged =
      !previousChunks ||
      previousChunks.chunks.length !== chunks.length ||
      previousChunks.chunks.some((old) => !chunks.some((chunk) => chunk.id === old.id));

    if (chunksChanged) {
      await chunkStore.save({
        version: 1,

        projectId,

        updatedAt: new Date().toISOString(),

        chunks,
      });
    }

    onProgress?.({ current: chunks.length, total: chunks.length, phase: 'index' });

    const indexed = this.fts.build(chunks);

    return {
      chunks: chunks.length,

      vectorsLoaded: 0,

      vectorsIndexed: indexed,

      vectorsRemoved: 0,

      totalVectors: this.fts.size,

      savedChunks: chunksChanged,

      savedVectors: chunksChanged,
    };
  }

  async search(query: string, limit = 8): Promise<SemanticCodeResult[]> {
    const hits = this.fts.search(query, limit);

    const output: SemanticCodeResult[] = [];

    for (const hit of hits) {
      const chunk = hit.chunk;

      const sourceWeight = codeSourceWeight(chunk.filePath, query);

      const lexicalScore = hit.score;

      /*
       * Vector/embedding search removed.
       * BM25 lexical score now drives ranking.
       */
      const vectorScore = 0;

      const score = lexicalScore * sourceWeight;

      output.push({
        chunk,

        score,

        vectorScore,

        lexicalScore,
      });
    }

    return output;
  }

  size(): number {
    return this.fts.size;
  }
}
