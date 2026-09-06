import type { ProjectManifest } from '../core/types.js';
import { TaskStore } from '../tasks/store.js';

export interface ProductionTaskHealth {
  ok: boolean;
  total: number;
  pending: number;
  active: number;
  blocked: number;
  completed: number;
  cancelled: number;
  conflicts: number;
  operationCount: number;
  error?: string;
}

export function inspectProductionTaskHealth(
  project: Pick<ProjectManifest, 'id' | 'rootPath'>
): ProductionTaskHealth {
  try {
    const store = new TaskStore(project);
    const projection = store.projection();
    const tasks = Object.values(projection.tasks);
    const conflicts = store.replicationConflicts().length;
    return {
      ok: conflicts === 0,
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      active: tasks.filter((task) => task.status === 'active').length,
      blocked: tasks.filter((task) => task.status === 'blocked').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
      cancelled: tasks.filter((task) => task.status === 'cancelled').length,
      conflicts,
      operationCount: projection.operationCount,
    };
  } catch (error) {
    return {
      ok: false,
      total: 0,
      pending: 0,
      active: 0,
      blocked: 0,
      completed: 0,
      cancelled: 0,
      conflicts: 0,
      operationCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
