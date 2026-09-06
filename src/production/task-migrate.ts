import type { ProjectManifest } from '../core/types.js';
import { TaskStore } from '../tasks/store.js';

export interface TaskMigrationResult {
  projectId: string;
  tasks: number;
  operations: number;
  conflicts: number;
  rebuilt: boolean;
}

export function migrateTaskProjection(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>
): TaskMigrationResult {
  const store = new TaskStore(project);
  const projection = store.rebuildProjection();
  return {
    projectId: project.id,
    tasks: Object.keys(projection.tasks).length,
    operations: projection.operationCount,
    conflicts: store.replicationConflicts().length,
    rebuilt: true,
  };
}
