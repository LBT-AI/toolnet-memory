import type { ProjectManifest } from '../core/types.js';

import { SnapshotManager } from '../snapshot/manager.js';

import type { StorageProvider } from '../storage/types.js';

import { executeGcCandidates } from './executor.js';

import { planLocalGc } from './local-planner.js';

import { selectSnapshotGcCandidates } from './snapshot-planner.js';

import type { GcExecutionResult, GcPlan, RetentionPolicy } from './types.js';

export interface GarbageCollectorOptions {
  remoteStorage?: StorageProvider;
}

export class GarbageCollector {
  private readonly snapshotManager?: SnapshotManager;

  constructor(
    private readonly project: ProjectManifest,
    private readonly policy: RetentionPolicy,
    options: GarbageCollectorOptions = {}
  ) {
    if (options.remoteStorage) {
      this.snapshotManager = new SnapshotManager(options.remoteStorage);
    }
  }

  async plan(includeRemote = false): Promise<GcPlan> {
    const local = planLocalGc(this.project, this.policy);

    if (!includeRemote) {
      return local;
    }

    if (!this.snapshotManager) {
      throw new Error('REMOTE_GC_STORAGE_NOT_CONFIGURED');
    }

    const snapshots = await this.snapshotManager.list(this.project.id);

    const remote = selectSnapshotGcCandidates(snapshots, this.policy);

    return {
      ...local,
      candidates: [...local.candidates, ...remote.candidates],
      protected: [...local.protected, ...remote.protected],
    };
  }

  async execute(plan: GcPlan, dryRun: boolean): Promise<GcExecutionResult> {
    if (plan.projectId !== this.project.id) {
      throw new Error('GC_PROJECT_MISMATCH');
    }

    if (plan.projectRoot !== this.project.rootPath) {
      throw new Error('GC_PROJECT_ROOT_MISMATCH');
    }

    /*
     * Re-plan immediately before destructive remote GC.
     *
     * This prevents a stale previously serialized plan
     * from becoming deletion authority.
     */
    if (!dryRun && plan.candidates.some((candidate) => candidate.scope === 'remote')) {
      if (!this.snapshotManager) {
        throw new Error('REMOTE_GC_STORAGE_NOT_CONFIGURED');
      }

      const current = await this.plan(true);

      plan = current;
    }

    return executeGcCandidates(this.project, this.policy, plan.candidates, {
      dryRun,
      snapshotManager: this.snapshotManager,
    });
  }
}
