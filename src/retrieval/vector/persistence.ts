import type { MemoryRecord } from '../../core/types.js';

import type { EmbeddingProvider } from '../../embeddings/provider.js';

import { PersistentVectorStore } from '../../storage/vector-store.js';

import { VectorIndexer } from './upsert.js';

import { VectorStore } from './vector-store.js';

export interface VectorPersistenceStats {
  loaded: number;
  indexed: number;
  removed: number;
  total: number;
  saved: boolean;
}

export class VectorPersistenceManager {
  constructor(
    private readonly projectId: string,

    private readonly model: string,

    private readonly embeddings: EmbeddingProvider,

    private readonly store: VectorStore,

    private readonly persistence: PersistentVectorStore
  ) {}

  async initialize(memories: MemoryRecord[]): Promise<VectorPersistenceStats> {
    let loaded = 0;

    const snapshot = await this.persistence.load(this.projectId);

    if (snapshot && snapshot.model === this.model) {
      loaded = this.store.importRecords(snapshot.records);
    }

    /*
     * Xóa vector không còn memory tương ứng.
     */
    const validIds = new Set(memories.map((memory) => memory.id));

    let removed = 0;

    for (const record of this.store.exportProject(this.projectId)) {
      if (!validIds.has(record.id)) {
        if (this.store.remove(record.id)) {
          removed++;
        }
      }
    }

    const indexer = new VectorIndexer(this.embeddings, this.store);

    const indexed = await indexer.index(memories);

    const records = this.store.exportProject(this.projectId);

    const dimensions = records[0]?.vector.length ?? this.embeddings.dimensions ?? 0;

    let saved = false;

    if (indexed > 0 || removed > 0 || !snapshot) {
      await this.persistence.save({
        version: 1,

        projectId: this.projectId,

        model: this.model,

        dimensions,

        updatedAt: new Date().toISOString(),

        records,
      });

      saved = true;
    }

    return {
      loaded,
      indexed,
      removed,
      total: records.length,
      saved,
    };
  }
}
