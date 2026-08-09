import type { MemoryRecord } from '../core/types.js';

import { BM25Scorer } from './bm25.js';

import { recencyScore } from './recency.js';

import { memoryImportanceScore } from './importance.js';

import { typePriority } from './type-priority.js';

import { QueryAnalyzer } from './query-analyzer.js';

import type { RetrievalOptions, RetrievalResult } from './types.js';

export class HybridSearch {
  private readonly bm25 = new BM25Scorer();

  private readonly analyzer = new QueryAnalyzer();

  search(
    query: string,
    memories: MemoryRecord[],
    options: RetrievalOptions = {}
  ): RetrievalResult[] {
    const topK = options.topK ?? 8;

    const minScore = options.minScore ?? 0.05;

    const analysis = this.analyzer.analyze(query);

    const results: RetrievalResult[] = [];

    for (const memory of memories) {
      if (options.types?.length && !options.types.includes(memory.type)) {
        continue;
      }

      const keyword = this.bm25.score(query, memory);

      const recency = recencyScore(memory);

      const importance = memoryImportanceScore(memory);

      let type = typePriority(memory.type);

      if (analysis.preferredTypes.includes(memory.type)) {
        type = Math.min(1, type + 0.25);
      }

      /*
       * Retrieval weighting:
       *
       * keyword    55%
       * importance 20%
       * recency    15%
       * type       10%
       */
      const score = keyword * 0.55 + importance * 0.2 + recency * 0.15 + type * 0.1;

      /*
       * Không cho memory hoàn toàn
       * không liên quan lọt vào chỉ
       * vì recency/importance cao.
       */
      // Keyword query phải có lexical match.
      // Type/recency/importance chỉ dùng để rerank,
      // không được tự kéo memory không liên quan vào Top-K.
      if (keyword <= 0) {
        continue;
      }

      if (score < minScore) {
        continue;
      }

      results.push({
        memory,
        score,
        scores: {
          keyword,
          recency,
          importance,
          type,
        },
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}
