import type { MemoryRecord } from '../core/types.js';
import { tokenize } from './tokenizer.js';

export class BM25Scorer {
  score(query: string, memory: MemoryRecord): number {
    const queryTokens = tokenize(query);
    const documentTokens = tokenize(
      [memory.content, ...(memory.tags ?? []), memory.type].join(' ')
    );

    if (queryTokens.length === 0 || documentTokens.length === 0) {
      return 0;
    }

    const frequencies = new Map<string, number>();

    for (const token of documentTokens) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }

    let score = 0;

    for (const token of queryTokens) {
      const tf = frequencies.get(token) ?? 0;

      if (tf === 0) {
        continue;
      }

      score += 1 + Math.log(1 + tf);
    }

    return score / queryTokens.length;
  }
}
