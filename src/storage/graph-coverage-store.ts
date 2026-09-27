import type { StorageProvider } from './types.js';

import type { GraphCoverageSnapshot } from '../code-intelligence/graph-coverage/types.js';

/*
 * Derived state, not authoritative memory/task state.
 *
 * Coverage is rebuildable from scan/parse/index metadata and lives under
 * the graph namespace:
 *
 *   projects/<projectId>/graph/coverage.json
 */
export class PersistentGraphCoverageStore {
  constructor(private readonly storage: StorageProvider) {}

  private key(projectId: string): string {
    return ['projects', projectId, 'graph', 'coverage.json'].join('/');
  }

  async load(projectId: string): Promise<GraphCoverageSnapshot | null> {
    const text = await this.storage.getText(this.key(projectId));

    if (!text) {
      return null;
    }

    return JSON.parse(text) as GraphCoverageSnapshot;
  }

  async save(snapshot: GraphCoverageSnapshot): Promise<void> {
    await this.storage.put(
      this.key(snapshot.projectId),
      JSON.stringify(snapshot),
      'application/json'
    );
  }
}
