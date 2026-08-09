import type { MemoryRecord } from '../../core/types.js';

import type { EmbeddingProvider } from '../../embeddings/provider.js';

import { VectorStore } from './vector-store.js';

export class VectorIndexer {
  constructor(
    private readonly embeddings: EmbeddingProvider,

    private readonly store: VectorStore
  ) {}

  async index(memories: MemoryRecord[]): Promise<number> {
    const pending = memories.filter((memory) => !this.store.has(memory.id));

    if (pending.length === 0) {
      return 0;
    }

    const vectors = await this.embeddings.embedMany(
      pending.map((memory) => [memory.type, memory.content, ...(memory.tags ?? [])].join(' '))
    );

    let indexed = 0;

    for (let i = 0; i < pending.length; i++) {
      const memory = pending[i];

      const vector = vectors[i];

      if (!memory || !vector) {
        continue;
      }

      this.store.upsert({
        id: memory.id,

        projectId: memory.projectId,

        vector,

        metadata: {
          type: memory.type,

          updatedAt: memory.updatedAt,
        },
      });

      indexed++;
    }

    return indexed;
  }
}
