import { randomUUID } from 'node:crypto';

import type { StorageProvider } from '../storage/types.js';

import type { EmbeddingProvider } from '../embeddings/provider.js';

export class ProductionHealth {
  constructor(
    private readonly storage: StorageProvider,

    private readonly embeddings?: EmbeddingProvider
  ) {}

  async run() {
    const key = `_health/production-${randomUUID()}.txt`;

    const payload = `toolnet-memory:${Date.now()}`;

    let storageOk = false;

    try {
      await this.storage.put(key, payload, 'text/plain');

      const value = await this.storage.getText(key);

      storageOk = value === payload;
    } finally {
      try {
        await this.storage.delete(key);
      } catch {
        // cleanup only
      }
    }

    let embedding: {
      ok: boolean;
      dimensions: number;
      mode: string;
    } | null = null;

    if (this.embeddings) {
      try {
        const vector = await this.embeddings.embed('ToolNet Memory production health check');

        embedding = {
          ok: vector.length > 0,

          dimensions: vector.length,

          mode: vector.length === 384 ? 'huggingface' : 'fallback-or-custom',
        };
      } catch {
        embedding = {
          ok: false,
          dimensions: 0,
          mode: 'failed',
        };
      }
    }

    return {
      ok: storageOk && (embedding === null || embedding.ok),

      storage: {
        ok: storageOk,

        provider: this.storage.name,
      },

      embedding,
    };
  }
}
