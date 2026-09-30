import type { SessionFlushResult } from './types.js';

export type SyncMaterializationStatus = 'ok' | 'noop' | 'failed';

/**
 * Canonical materialization outcome surfaced by CLI-sync adapters.
 *
 * SessionCore.flush() stays the single owner: adapters only project the
 * flush result so a successful command never hides a failed MemoryStore save.
 */
export interface SyncMaterialization {
  status: SyncMaterializationStatus;

  added: number;

  duplicates: number;

  memories: number;

  errorCode?: string;
}

export function syncMaterialization(
  flushResult: SessionFlushResult | undefined
): SyncMaterialization | undefined {
  const materialization = flushResult?.materialization;

  if (!materialization) {
    return undefined;
  }

  return {
    status: materialization.status,

    added: materialization.added,

    duplicates: materialization.duplicates,

    memories: materialization.memories,

    ...(materialization.errorCode ? { errorCode: materialization.errorCode } : {}),
  };
}
