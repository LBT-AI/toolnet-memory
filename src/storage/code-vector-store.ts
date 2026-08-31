import type { StorageProvider } from './types.js';

import type { VectorRecord } from '../retrieval/vector/vector-store.js';

export interface CodeVectorSnapshot {
  version: 1;

  projectId: string;

  model: string;
  dimensions: number;

  updatedAt: string;

  records: VectorRecord[];
}

export class PersistentCodeVectorStore {
  constructor(private readonly storage: StorageProvider) {}

  private key(projectId: string): string {
    return ['projects', projectId, 'code', 'vectors', 'current.json'].join('/');
  }

  async load(projectId: string): Promise<CodeVectorSnapshot | null> {
    const text = await this.storage.getText(this.key(projectId));

    if (!text) {
      return null;
    }

    return JSON.parse(text) as CodeVectorSnapshot;
  }

  async save(snapshot: CodeVectorSnapshot): Promise<void> {
    await this.storage.put(
      this.key(snapshot.projectId),

      JSON.stringify(snapshot),

      'application/json'
    );
  }
}
