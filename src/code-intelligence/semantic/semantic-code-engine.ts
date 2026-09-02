import type { CodeGraphStore } from '../graph/graph-store.js';
import type { StorageProvider } from '../../storage/types.js';
import type { StageProgressCallback } from '../types.js';
import { PersistentCodeChunkStore } from '../../storage/code-chunk-store.js';
import { SmartCodeChunker } from '../chunks/smart-chunker.js';
import type { CodeChunk } from '../chunks/types.js';
import { CodeFtsIndex } from './code-fts.js';
import { codeSourceWeight } from './source-priority.js';
import {
  LOCAL_CODE_SEARCH_CONTRACT,
  LOCAL_CODE_SEARCH_ENGINE,
  LOCAL_CODE_SEARCH_MODE,
  type LocalCodeSearchEngine,
  type LocalCodeSearchMode,
} from './search-contract.js';
export interface SemanticCodeResult {
  chunk: CodeChunk;
  score: number;
  lexicalScore: number;
  engine: LocalCodeSearchEngine;
  mode: LocalCodeSearchMode;
  /*
   * Compatibility field.
   *
   * Vector/embedding retrieval was removed.
   * Keep this property so existing clients do not break.
   */
  vectorScore: 0;
}
export interface CodeSemanticStats {
  chunks: number;
  documentsIndexed: number;
  indexSize: number;
  engine: LocalCodeSearchEngine;
  mode: LocalCodeSearchMode;
  embedding: false;
  vectorDatabase: false;
  savedChunks: boolean;
  /*
   * Legacy compatibility fields.
   *
   * They must not be interpreted as evidence that a vector
   * index exists.
   */
  vectorsLoaded: 0;
  vectorsIndexed: number;
  vectorsRemoved: 0;
  totalVectors: number;
  savedVectors: boolean;
}
/**
 * Backward-compatible public class name.
 *
 * Despite the historical `SemanticCodeEngine` name, current
 * search is deterministic lexical retrieval backed by
 * SQLite FTS5 with BM25 ranking.
 *
 * No model.
 * No embeddings.
 * No vector database.
 * No network dependency.
 */
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
  get searchContract() {
    return LOCAL_CODE_SEARCH_CONTRACT;
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
    onProgress?.({
      current: chunks.length,
      total: chunks.length,
      phase: 'index',
      detail: LOCAL_CODE_SEARCH_ENGINE,
    });
    const indexed = this.fts.build(chunks);
    return {
      chunks: chunks.length,
      documentsIndexed: indexed,
      indexSize: this.fts.size,
      engine: LOCAL_CODE_SEARCH_ENGINE,
      mode: LOCAL_CODE_SEARCH_MODE,
      embedding: false,
      vectorDatabase: false,
      savedChunks: chunksChanged,
      /*
       * Legacy output contract.
       */
      vectorsLoaded: 0,
      vectorsIndexed: indexed,
      vectorsRemoved: 0,
      totalVectors: this.fts.size,
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
       * SQLite FTS5 BM25 is the only retrieval score.
       *
       * vectorScore remains exactly zero solely for
       * backwards-compatible result shape.
       */
      const vectorScore = 0 as const;
      const score = lexicalScore * sourceWeight;
      output.push({
        chunk,
        score,
        lexicalScore,
        vectorScore,
        engine: LOCAL_CODE_SEARCH_ENGINE,
        mode: LOCAL_CODE_SEARCH_MODE,
      });
    }
    return output;
  }
  size(): number {
    return this.fts.size;
  }
}
/*
 * Canonical non-breaking alias for new integrations.
 *
 * Existing imports of SemanticCodeEngine remain valid.
 */
export { SemanticCodeEngine as LocalCodeSearchEngineRuntime };
