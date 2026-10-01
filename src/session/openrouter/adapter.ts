import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

export interface OpenRouterSyncOptions {
  project: ProjectManifest;
  storage: StorageProvider;
}

export interface OpenRouterSyncResult {
  blocked: boolean;
  reason: string;
}

export async function syncOpenRouterSession(
  _options: OpenRouterSyncOptions
): Promise<OpenRouterSyncResult> {
  return {
    blocked: true,
    reason: 'OpenRouter CLI product identity is blocked for ToolNet integration.',
  };
}
