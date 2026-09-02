import { existsSync, rmSync } from 'node:fs';

import type { ProjectManifest } from '../core/types.js';

import type { SnapshotManager } from '../snapshot/manager.js';

import { safeLocalCandidateNow } from './local-planner.js';

import type { GcCandidate, GcExecutionItem, GcExecutionResult, RetentionPolicy } from './types.js';

export interface ExecuteGcOptions {
  dryRun: boolean;
  snapshotManager?: SnapshotManager;
}

export async function executeGcCandidates(
  project: ProjectManifest,
  policy: RetentionPolicy,
  candidates: GcCandidate[],
  options: ExecuteGcOptions
): Promise<GcExecutionResult> {
  const items: GcExecutionItem[] = [];

  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  let bytesFreed = 0;

  for (const candidate of candidates) {
    if (options.dryRun) {
      items.push({
        candidate,
        status: 'skipped',
        detail: 'dry-run',
      });
      skipped += 1;
      continue;
    }

    if (candidate.action === 'delete-file') {
      const safety = safeLocalCandidateNow(project, candidate, policy);

      if (!safety.safe) {
        items.push({
          candidate,
          status: 'skipped',
          detail: safety.detail ?? 'safety check rejected target',
        });
        skipped += 1;
        continue;
      }

      try {
        if (!existsSync(candidate.target)) {
          items.push({
            candidate,
            status: 'skipped',
            detail: 'target already absent',
          });
          skipped += 1;
          continue;
        }

        rmSync(candidate.target, {
          force: true,
        });

        items.push({
          candidate,
          status: 'deleted',
        });
        deleted += 1;
        bytesFreed += candidate.size ?? 0;
      } catch (error) {
        items.push({
          candidate,
          status: 'failed',
          detail: error instanceof Error ? error.message : String(error),
        });
        failed += 1;
      }

      continue;
    }

    if (candidate.action === 'delete-snapshot') {
      if (candidate.scope !== 'remote' || !candidate.snapshotId) {
        items.push({
          candidate,
          status: 'skipped',
          detail: 'invalid snapshot candidate',
        });
        skipped += 1;
        continue;
      }

      if (!options.snapshotManager) {
        items.push({
          candidate,
          status: 'skipped',
          detail: 'remote snapshot manager unavailable',
        });
        skipped += 1;
        continue;
      }

      try {
        await options.snapshotManager.remove(project.id, candidate.snapshotId);

        items.push({
          candidate,
          status: 'deleted',
        });
        deleted += 1;
      } catch (error) {
        items.push({
          candidate,
          status: 'failed',
          detail: error instanceof Error ? error.message : String(error),
        });
        failed += 1;
      }

      continue;
    }

    items.push({
      candidate,
      status: 'skipped',
      detail: 'unsupported GC action',
    });
    skipped += 1;
  }

  return {
    dryRun: options.dryRun,
    deleted,
    skipped,
    failed,
    bytesFreed,
    items,
  };
}
