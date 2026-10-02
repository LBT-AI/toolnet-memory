import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

export interface WarpRecoveryOptions {
  project: ProjectManifest;

  storage: StorageProvider;
}

export interface WarpRecoveryResult {
  blocked: boolean;

  reason: string;
}

export async function recoverWarpProject(
  _options: WarpRecoveryOptions
): Promise<WarpRecoveryResult[]> {
  return [
    {
      blocked: true,
      reason: 'Warp Agent CLI capability is blocked for ToolNet integration.',
    },
  ];
}
