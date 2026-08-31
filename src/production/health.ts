import { randomUUID } from 'node:crypto';

import type { StorageProvider } from '../storage/types.js';

export class ProductionHealth {
  constructor(private readonly storage: StorageProvider) {}

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

    return {
      ok: storageOk,

      storage: {
        ok: storageOk,

        provider: this.storage.name,
      },

      embedding: null,
    };
  }
}
