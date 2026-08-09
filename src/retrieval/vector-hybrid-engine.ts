import type { MemoryEngine } from '../core/memory-engine.js';

import type { MemoryRecord } from '../core/types.js';

import type { EmbeddingProvider } from '../embeddings/provider.js';

import { HybridSearch } from './hybrid-search.js';

import { ContextBuilder } from './context-builder.js';

import { VectorIndexer } from './vector/upsert.js';

import { VectorSearch } from './vector/search.js';

import { VectorStore } from './vector/vector-store.js';

export interface VectorHybridResult {
  memory: MemoryRecord;

  score: number;

  lexicalScore: number;
  vectorScore: number;
}

export class VectorHybridEngine {
  private readonly lexical = new HybridSearch();

  private readonly contextBuilder = new ContextBuilder();

  private readonly store: VectorStore;

  private readonly indexer: VectorIndexer;

  private readonly vectorSearch: VectorSearch;

  constructor(
    private readonly memory: MemoryEngine,

    embeddings: EmbeddingProvider,

    store: VectorStore = new VectorStore()
  ) {
    this.store = store;

    this.indexer = new VectorIndexer(embeddings, this.store);

    this.vectorSearch = new VectorSearch(embeddings, this.store);
  }

  async rebuild(projectId: string): Promise<number> {
    this.store.clearProject(projectId);

    return this.indexer.index(this.memory.list(projectId));
  }

  async search(projectId: string, query: string, topK = 8): Promise<VectorHybridResult[]> {
    const memories = this.memory.list(projectId);

    const byId = new Map(memories.map((memory) => [memory.id, memory]));

    const lexicalResults = this.lexical.search(query, memories, {
      topK: Math.max(topK * 3, 20),
    });

    const vectorResults = await this.vectorSearch.search(projectId, query, Math.max(topK * 3, 20));

    const merged = new Map<
      string,
      {
        lexicalScore: number;
        vectorScore: number;
      }
    >();

    for (const result of lexicalResults) {
      merged.set(result.memory.id, {
        lexicalScore: result.score,

        vectorScore: 0,
      });
    }

    for (const result of vectorResults) {
      const current = merged.get(result.id) ?? {
        lexicalScore: 0,
        vectorScore: 0,
      };

      current.vectorScore = Math.max(0, result.score);

      merged.set(result.id, current);
    }

    const results: VectorHybridResult[] = [];

    for (const [id, scores] of merged) {
      const memory = byId.get(id);

      if (!memory) {
        continue;
      }

      /*
       * Hybrid:
       * lexical/relevance 55%
       * vector semantic   45%
       */
      const score = scores.lexicalScore * 0.55 + scores.vectorScore * 0.45;

      results.push({
        memory,
        score,

        lexicalScore: scores.lexicalScore,

        vectorScore: scores.vectorScore,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async context(projectId: string, query: string, topK = 5): Promise<string> {
    const results = await this.search(projectId, query, topK);

    return this.contextBuilder.build(
      results.map((result) => ({
        memory: result.memory,

        score: result.score,

        scores: {
          keyword: result.lexicalScore,

          recency: 0,
          importance: 0,
          type: result.vectorScore,
        },
      }))
    );
  }
}
