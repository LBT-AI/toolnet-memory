import type { StorageProvider } from './types.js';

import type { CrossServiceSnapshot } from '../code-intelligence/cross-service/types.js';

/*
 * Derived state, not authoritative memory/task state.
 *
 * Cross-service linkage is rebuildable from source + extractor versions and
 * lives under the graph namespace:
 *
 *   projects/<projectId>/graph/cross-service.json
 *
 * Project isolation is enforced by the project-scoped storage provider.
 */
export class PersistentCrossServiceStore {
  constructor(private readonly storage: StorageProvider) {}

  private key(projectId: string): string {
    return ['projects', projectId, 'graph', 'cross-service.json'].join('/');
  }

  async load(projectId: string): Promise<CrossServiceSnapshot | null> {
    const text = await this.storage.getText(this.key(projectId));

    if (!text) {
      return null;
    }

    return JSON.parse(text) as CrossServiceSnapshot;
  }

  async save(snapshot: CrossServiceSnapshot): Promise<void> {
    await this.storage.put(
      this.key(snapshot.projectId),
      JSON.stringify(snapshot),
      'application/json'
    );
  }
}
