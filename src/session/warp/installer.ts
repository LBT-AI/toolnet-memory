import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { warpConfigPaths } from './config-paths.js';

export interface WarpInstallOptions {
  binary?: string;
}

export interface WarpInstallResult {
  configFile: string;

  blocked: boolean;

  changed: boolean;
}

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
}

export function installWarpIntegration(_options: WarpInstallOptions = {}): WarpInstallResult {
  const configPaths = warpConfigPaths();
  const configFile = join(configPaths[0], 'toolnet-memory.json');

  mkdirSync(dirname(configFile), { recursive: true, mode: 0o700 });

  const root = existsSync(configFile) ? JSON.parse(readFileSync(configFile, 'utf8')) : {};

  root.toolnetMemory = {
    integration: 'toolnet-memory',
    captureMode: 'blocked-capability',
    managedBy: 'toolnet-memory',
    blocked: true,
    reason: 'Warp Agent CLI capability is blocked for ToolNet integration.',
  };

  const next = JSON.stringify(root, null, 2) + '\n';

  const changed = !existsSync(configFile) || readFileSync(configFile, 'utf8') !== next;

  atomicWriteJson(configFile, root);

  return {
    configFile,
    blocked: true,
    changed,
  };
}
