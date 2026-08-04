export interface SnapshotManifest {
  version: 1;

  id: string;
  projectId: string;

  createdAt: string;
  reason: string;

  objects: string[];

  metadata?: Record<string, unknown>;
}
