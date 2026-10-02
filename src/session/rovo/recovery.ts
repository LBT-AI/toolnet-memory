import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncRovoSession } from './adapter.js';

export interface RovoRecoveryOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  limit?: number;
}

export interface RovoRecoveryResult {
  eventType: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;
}

export async function recoverRovoProject(
  options: RovoRecoveryOptions
): Promise<RovoRecoveryResult[]> {
  const limit = options.limit ?? 100;
  const results: RovoRecoveryResult[] = [];

  for (let i = 0; i < limit; i++) {
    const sessionId = `rovo-recovery-${options.project.id}-${i}`;

    const result = await syncRovoSession({
      project: options.project,
      storage: options.storage,
      eventType: 'session_end',
      payload: { session_id: sessionId },
      cwd: options.project.rootPath,
    });

    results.push({
      eventType: result.eventType,
      imported: result.imported,
      eventCount: result.eventCount,
      chunkCount: result.chunkCount,
      status: result.status,
      reset: result.reset,
    });
  }

  return results;
}
