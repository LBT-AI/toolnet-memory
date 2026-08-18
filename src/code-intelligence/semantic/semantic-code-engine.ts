import type { EmbeddingProvider } from '../../embeddings/provider.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { StorageProvider } from '../../storage/types.js';

import type { StageProgressCallback } from '../types.js';

import { PersistentCodeChunkStore } from '../../storage/code-chunk-store.js';

import { PersistentCodeVectorStore } from '../../storage/code-vector-store.js';

import { SmartCodeChunker } from '../chunks/smart-chunker.js';

import type { CodeChunk } from '../chunks/types.js';

import { VectorStore } from '../../retrieval/vector/vector-store.js';

import { tokenize } from '../../retrieval/tokenizer.js';

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
  private readonly vectors = new VectorStore();

  private readonly chunks = new Map<string, CodeChunk>();

  constructor(
    private readonly options: {
      projectId: string;
      rootPath: string;

      model: string;

      storage: StorageProvider;

      embeddings: EmbeddingProvider;

      graph: CodeGraphStore;
    }
  ) {}

  async initialize(onProgress?: StageProgressCallback): Promise<CodeSemanticStats> {
    const { projectId, rootPath, storage, embeddings, graph, model } = this.options;

    const chunkStore = new PersistentCodeChunkStore(storage);

    const vectorStore = new PersistentCodeVectorStore(storage);

    const chunks = await new SmartCodeChunker().build(
      projectId,
      rootPath,
      graph.allSymbols(projectId)
    );

    this.chunks.clear();

    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }

    const previousChunks = await chunkStore.load(projectId);

    const chunksChanged =
      !previousChunks ||
      previousChunks.chunks.length !== chunks.length ||
      previousChunks.chunks.some((old) => !this.chunks.has(old.id));

    if (chunksChanged) {
      await chunkStore.save({
        version: 1,

        projectId,

        updatedAt: new Date().toISOString(),

        chunks,
      });
    }

    const previousVectors = await vectorStore.load(projectId);

    let vectorsLoaded = 0;

    if (previousVectors && previousVectors.model === model) {
      vectorsLoaded = this.vectors.importRecords(previousVectors.records);
    }

    const validIds = new Set(chunks.map((chunk) => chunk.id));

    let vectorsRemoved = 0;

    for (const record of this.vectors.exportProject(projectId)) {
      if (!validIds.has(record.id)) {
        if (this.vectors.remove(record.id)) {
          vectorsRemoved++;
        }
      }
    }

    const pending = chunks.filter((chunk) => {
      const existing = this.vectors.get(chunk.id);

      if (!existing) {
        return true;
      }

      return existing.metadata?.contentHash !== chunk.contentHash;
    });

    let vectorsIndexed = 0;

    /*
     * Batch nhỏ để tránh request embedding quá lớn.
     */
    const batchSize = 8;

    let targetDimensions = this.vectors.exportProject(projectId)[0]?.vector.length;

    const totalBatches = Math.ceil(pending.length / batchSize);
    let completedBatches = 0;

    for (let offset = 0; offset < pending.length; offset += batchSize) {
      const batch = pending.slice(offset, offset + batchSize);

      const texts = batch.map((chunk) =>
        [
          `file: ${chunk.filePath}`,

          chunk.symbolName ? `symbol: ${chunk.symbolName}` : '',

          chunk.symbolType ? `type: ${chunk.symbolType}` : '',

          chunk.content,
        ]
          .filter(Boolean)
          .join('\n')
      );

      const vectors = await embeddings.embedMany(texts);

      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i];

        const vector = vectors[i];

        if (!chunk || !vector || vector.length === 0) {
          continue;
        }

        if (targetDimensions === undefined) {
          targetDimensions = vector.length;
        }

        /*
         * Không cho trộn vector 384d/128d
         * nếu provider fallback giữa chừng.
         */
        if (vector.length !== targetDimensions) {
          console.warn(
            `[code-semantic] skip dimension mismatch: ${vector.length} != ${targetDimensions}`
          );

          continue;
        }

        this.vectors.upsert({
          id: chunk.id,

          projectId,

          vector,

          metadata: {
            contentHash: chunk.contentHash,

            filePath: chunk.filePath,

            symbolName: chunk.symbolName,

            symbolType: chunk.symbolType,

            startLine: chunk.startLine,

            endLine: chunk.endLine,
          },
        });

        vectorsIndexed++;
      }

      completedBatches++;
      onProgress?.({
        current: completedBatches,
        total: totalBatches,
        phase: 'embedding',
      });
    }

    const records = this.vectors.exportProject(projectId);

    const shouldSaveVectors =
      vectorsIndexed > 0 ||
      vectorsRemoved > 0 ||
      !previousVectors ||
      previousVectors.model !== model;

    if (shouldSaveVectors) {
      onProgress?.({
        current: totalBatches,
        total: totalBatches,
        phase: 'saving',
      });

      await vectorStore.save({
        version: 1,

        projectId,

        model,

        dimensions: records[0]?.vector.length ?? targetDimensions ?? 0,

        updatedAt: new Date().toISOString(),

        records,
      });
    }

    return {
      chunks: chunks.length,

      vectorsLoaded,

      vectorsIndexed,

      vectorsRemoved,

      totalVectors: records.length,

      savedChunks: chunksChanged,

      savedVectors: shouldSaveVectors,
    };
  }

  async search(query: string, limit = 8): Promise<SemanticCodeResult[]> {
    const queryVector = await this.options.embeddings.embed(query);

    const vectorResults = this.vectors.search(
      this.options.projectId,
      queryVector,
      Math.max(limit * 4, 20)
    );

    const queryTokens = new Set(tokenize(query));

    const output: SemanticCodeResult[] = [];

    for (const result of vectorResults) {
      const chunk = this.chunks.get(result.id);

      if (!chunk) {
        continue;
      }

      const documentTokens = new Set(
        tokenize(
          [chunk.filePath, chunk.symbolName ?? '', chunk.symbolType ?? '', chunk.content].join(' ')
        )
      );

      let matches = 0;

      for (const token of queryTokens) {
        if (documentTokens.has(token)) {
          matches++;
        }
      }

      const lexicalScore = queryTokens.size === 0 ? 0 : matches / queryTokens.size;

      const vectorScore = Math.max(0, result.score);

      /*
       * Semantic quan trọng hơn lexical.
       */
      const sourceWeight = codeSourceWeight(chunk.filePath, query);

      const score = (vectorScore * 0.75 + lexicalScore * 0.25) * sourceWeight;

      output.push({
        chunk,
        score,
        vectorScore,
        lexicalScore,
      });
    }

    return output.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  size(): number {
    return this.chunks.size;
  }
}
