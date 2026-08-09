import type { EmbeddingProvider } from '../../embeddings/provider.js';

import { VectorStore } from './vector-store.js';

export class VectorSearch {
  constructor(
    private readonly embeddings: EmbeddingProvider,

    private readonly store: VectorStore
  ) {}

  async search(projectId: string, query: string, limit = 10) {
    const vector = await this.embeddings.embed(query);

    return this.store.search(projectId, vector, limit);
  }
}
