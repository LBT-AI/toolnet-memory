import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { openRouterConfigPaths } from './config-paths.js';

export interface OpenRouterStatus {
  binaryDetected: boolean;
  blocked: boolean;
  configPath?: string;
  configReady: boolean;
}

export function inspectOpenRouterStatus(): OpenRouterStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v openrouter >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const home = homedir();
  const configPaths = openRouterConfigPaths(home);
  const configReady = configPaths.some((path) => existsSync(path));

  let configPath: string | undefined;

  if (configReady) {
    configPath = configPaths.find((path) => existsSync(path));
  }

  return {
    binaryDetected,
    blocked: true,
    configPath,
    configReady,
  };
}
