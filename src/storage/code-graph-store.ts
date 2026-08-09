import type { StorageProvider } from './types.js';

import type { CodeGraphSnapshot } from '../code-intelligence/types.js';

export class PersistentCodeGraphStore {
  constructor(private readonly storage: StorageProvider) {}

  private key(projectId: string): string {
    return ['projects', projectId, 'graph', 'current.json'].join('/');
  }

  async load(projectId: string): Promise<CodeGraphSnapshot | null> {
    const text = await this.storage.getText(this.key(projectId));

    if (!text) {
      return null;
    }

    return JSON.parse(text) as CodeGraphSnapshot;
  }

  async save(snapshot: CodeGraphSnapshot): Promise<void> {
    await this.storage.put(
      this.key(snapshot.projectId),

      JSON.stringify(snapshot),

      'application/json'
    );
  }
}
