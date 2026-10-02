import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

export interface WarpSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;
}

export interface WarpSyncResult {
  blocked: boolean;

  reason: string;
}

export async function syncWarpSession(_options: WarpSyncOptions): Promise<WarpSyncResult> {
  return {
    blocked: true,
    reason: 'Warp Agent CLI capability is blocked for ToolNet integration.',
  };
}
