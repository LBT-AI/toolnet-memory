import { existsSync, readFileSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { rovoConfigPaths } from './config-paths.js';

export interface RovoStatus {
  binaryDetected: boolean;

  configReady: boolean;

  hooksAvailable: boolean;

  configPath?: string;

  /**
   * Atlassian Rovo hook API is preview/experimental: automatic capture is
   * functional but may change on stabilization. Always true until the API
   * stabilizes; status and docs must keep saying so (README Rovo section).
   */
  preview: true;

  previewReason: string;
}

export const ROVO_PREVIEW_REASON =
  'Atlassian Rovo hook API is preview/experimental; capture behavior may change on stabilization.';

export function inspectRovoStatus(): RovoStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v rovo >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const configPaths = rovoConfigPaths();
  const configReady = configPaths.some((path) => existsSync(path));

  let configPath: string | undefined;

  if (configReady) {
    configPath = configPaths.find((path) => existsSync(path));
  }

  const hooksAvailable =
    configReady && configPath
      ? readFileSync(configPath, 'utf8').includes('toolnet-memory hook rovo')
      : false;

  return {
    binaryDetected,
    configReady,
    hooksAvailable,
    configPath,
    preview: true as const,
    previewReason: ROVO_PREVIEW_REASON,
  };
}
