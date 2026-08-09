import type { ArchitectureSnapshot } from '../code-intelligence/architecture/types.js';

import type { StorageProvider } from './types.js';

export class PersistentArchitectureStore {
  constructor(private readonly storage: StorageProvider) {}

  private base(projectId: string): string {
    return ['projects', projectId, 'code', 'architecture'].join('/');
  }

  async load(projectId: string): Promise<ArchitectureSnapshot | null> {
    const text = await this.storage.getText(`${this.base(projectId)}/current.json`);

    if (!text) {
      return null;
    }

    return JSON.parse(text) as ArchitectureSnapshot;
  }

  async save(snapshot: ArchitectureSnapshot): Promise<void> {
    const base = this.base(snapshot.projectId);

    const envelope = <T>(data: T) =>
      JSON.stringify(
        {
          version: snapshot.version,

          projectId: snapshot.projectId,

          updatedAt: snapshot.updatedAt,

          data,
        },
        null,
        2
      );

    await Promise.all([
      this.storage.put(
        `${base}/current.json`,
        JSON.stringify(snapshot, null, 2),
        'application/json'
      ),

      this.storage.put(
        `${base}/entry-points.json`,
        envelope(snapshot.entryPoints),
        'application/json'
      ),

      this.storage.put(`${base}/hotspots.json`, envelope(snapshot.hotspots), 'application/json'),

      this.storage.put(`${base}/layers.json`, envelope(snapshot.layers), 'application/json'),

      this.storage.put(`${base}/clusters.json`, envelope(snapshot.clusters), 'application/json'),
    ]);
  }
}
