import type { StorageProvider } from '../storage/types.js';

import type { SnapshotManifest } from './types.js';

const CURRENT_OBJECTS = [
  'memories/current.json',
  'vectors/current.json',
  'graph/current.json',
  'graph/manifest.json',
  'graph/resolution/current.json',
  'code/chunks/current.json',
  'code/vectors/current.json',
  'code/architecture/current.json',
  'code/architecture/entry-points.json',
  'code/architecture/hotspots.json',
  'code/architecture/layers.json',
  'code/architecture/clusters.json',
  'code/analysis/current.json',
  'code/analysis/dead-code.json',
  'code/analysis/dependencies.json',
  'code/visualization/graph.json',
];

export class SnapshotManager {
  constructor(private readonly storage: StorageProvider) {}

  private projectPrefix(projectId: string): string {
    return `projects/${projectId}`;
  }

  private snapshotPrefix(projectId: string, snapshotId: string): string {
    return [this.projectPrefix(projectId), 'snapshots', snapshotId].join('/');
  }

  async create(
    projectId: string,
    reason = 'automatic',
    metadata?: Record<string, unknown>
  ): Promise<SnapshotManifest | null> {
    const createdAt = new Date().toISOString();

    const id = createdAt.replace(/[:.]/g, '-');

    const base = this.projectPrefix(projectId);

    const snapshotBase = this.snapshotPrefix(projectId, id);

    const savedObjects: string[] = [];

    for (const relativeKey of CURRENT_OBJECTS) {
      const sourceKey = `${base}/${relativeKey}`;

      const data = await this.storage.get(sourceKey);

      if (!data) {
        continue;
      }

      await this.storage.put(`${snapshotBase}/${relativeKey}`, data, 'application/json');

      savedObjects.push(relativeKey);
    }

    if (savedObjects.length === 0) {
      return null;
    }

    const manifest: SnapshotManifest = {
      version: 1,

      id,
      projectId,

      createdAt,
      reason,

      objects: savedObjects,

      metadata,
    };

    await this.storage.put(
      `${snapshotBase}/snapshot.json`,

      JSON.stringify(manifest, null, 2),

      'application/json'
    );

    return manifest;
  }

  async list(projectId: string): Promise<SnapshotManifest[]> {
    const prefix = [this.projectPrefix(projectId), 'snapshots'].join('/');

    const files = await this.storage.list(prefix);

    const manifests = files.filter((file) => file.key.endsWith('/snapshot.json'));

    const output: SnapshotManifest[] = [];

    for (const item of manifests) {
      const text = await this.storage.getText(item.key);

      if (!text) {
        continue;
      }

      try {
        output.push(JSON.parse(text) as SnapshotManifest);
      } catch {
        // Ignore damaged snapshot manifests.
      }
    }

    return output.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async restore(
    projectId: string,
    snapshotId: string
  ): Promise<{
    restored: string[];
  }> {
    const snapshotBase = this.snapshotPrefix(projectId, snapshotId);

    const manifestText = await this.storage.getText(`${snapshotBase}/snapshot.json`);

    if (!manifestText) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const manifest = JSON.parse(manifestText) as SnapshotManifest;

    if (manifest.projectId !== projectId) {
      throw new Error('Snapshot project mismatch');
    }

    const base = this.projectPrefix(projectId);

    const restored: string[] = [];

    for (const relativeKey of manifest.objects) {
      const data = await this.storage.get(`${snapshotBase}/${relativeKey}`);

      if (!data) {
        continue;
      }

      await this.storage.put(`${base}/${relativeKey}`, data, 'application/json');

      restored.push(relativeKey);
    }

    return {
      restored,
    };
  }

  async remove(projectId: string, snapshotId: string): Promise<number> {
    const prefix = this.snapshotPrefix(projectId, snapshotId);

    const objects = await this.storage.list(prefix);

    for (const object of objects) {
      await this.storage.delete(object.key);
    }

    return objects.length;
  }

  async prune(projectId: string, keep = 10): Promise<number> {
    const snapshots = await this.list(projectId);

    const remove = snapshots.slice(keep);

    let deleted = 0;

    for (const snapshot of remove) {
      await this.remove(projectId, snapshot.id);

      deleted++;
    }

    return deleted;
  }
}
