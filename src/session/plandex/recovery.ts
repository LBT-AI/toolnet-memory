import { existsSync, readdirSync } from 'node:fs';

import { join } from 'node:path';

import { homedir } from 'node:os';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncPlandexPlan, type PlandexSyncResult } from './adapter.js';

export interface PlandexRecoveryOptions {
  project: ProjectManifest;
  storage: StorageProvider;
  planIds?: string[];
  baseDir?: string;
  limit?: number;
}

export interface PlandexRecoveryResult {
  orgId: string;
  planId: string;
  imported: number;
  eventCount: number;
  chunkCount: number;
  status: string;
  reset: boolean;
  materialization?: import('../sync-materialization.js').SyncMaterialization;
}

function plandexBaseDir(): string {
  return process.env.PLANDEX_BASE_DIR ?? join(homedir(), 'plandex-server');
}

export async function recoverPlandexProject(
  options: PlandexRecoveryOptions
): Promise<PlandexRecoveryResult[]> {
  const { project, storage, baseDir, planIds, limit = 100 } = options;

  const planBaseDir = baseDir ?? plandexBaseDir();

  const orgsDir = join(planBaseDir, 'orgs');

  if (!existsSync(orgsDir)) {
    return [];
  }

  const orgs = readdirSync(orgsDir).filter((org) => !org.startsWith('.'));
  const results: PlandexRecoveryResult[] = [];

  for (const orgId of orgs) {
    const plansDir = join(orgsDir, orgId, 'plans');

    if (!existsSync(plansDir)) {
      continue;
    }

    const plans = readdirSync(plansDir).filter((plan) => !plan.startsWith('.'));

    if (planIds && planIds.length > 0) {
      const filtered = plans.filter((plan) => planIds.includes(plan));
      plans.length = 0;
      plans.push(...filtered);
    }

    for (const planId of plans) {
      if (results.length >= limit) {
        break;
      }

      const conversationDir = join(plansDir, planId, 'conversation');

      if (!existsSync(conversationDir)) {
        continue;
      }

      try {
        const result = await syncPlandexPlan({
          project,
          storage,
          plan: { orgId, planId },
          cwd: project.rootPath,
          baseDir: planBaseDir,
        });

        results.push({
          orgId: result.orgId,
          planId: result.planId,
          imported: result.imported,
          eventCount: result.eventCount,
          chunkCount: result.chunkCount,
          status: result.status,
          reset: result.reset,
          materialization: result.materialization,
        });
      } catch {
        // Fail-open on capture errors; WAL remains for later recovery.
      }
    }

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}
