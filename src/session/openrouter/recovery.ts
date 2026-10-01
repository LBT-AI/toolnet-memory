import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

export interface OpenRouterRecoveryOptions {
  project: ProjectManifest;
  storage: StorageProvider;
}

export interface OpenRouterRecoveryResult {
  blocked: boolean;
  reason: string;
}

export async function recoverOpenRouterProject(
  _options: OpenRouterRecoveryOptions
): Promise<OpenRouterRecoveryResult[]> {
  return [
    {
      blocked: true,
      reason: 'OpenRouter CLI product identity is blocked for ToolNet integration.',
    },
  ];
}
