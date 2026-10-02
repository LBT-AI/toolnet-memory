import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncClineSession } from './adapter.js';

export interface ClineRecoveryOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  limit?: number;
}

export interface ClineRecoveryResult {
  hookName: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;
}

export async function recoverClineProject(
  options: ClineRecoveryOptions
): Promise<ClineRecoveryResult[]> {
  const limit = options.limit ?? 100;
  const results: ClineRecoveryResult[] = [];

  for (let i = 0; i < limit; i++) {
    const sessionId = `cline-recovery-${options.project.id}-${i}`;

    const result = await syncClineSession({
      project: options.project,
      storage: options.storage,
      hookName: 'TaskComplete',
      payload: { sessionId },
      cwd: options.project.rootPath,
    });

    results.push({
      hookName: result.hookName,
      imported: result.imported,
      eventCount: result.eventCount,
      chunkCount: result.chunkCount,
      status: result.status,
      reset: result.reset,
    });
  }

  return results;
}
