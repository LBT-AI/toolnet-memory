import { spawnSync } from 'node:child_process';

import { readFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { bobDetectionPaths, bobGlobalSettingsFile } from './config-paths.js';

export interface BobStatus {
  detected: boolean;

  configured: boolean;

  hooksReady: boolean;

  lastCaptureAt?: string;

  error?: string;
}

export function inspectBobStatus(): BobStatus {
  try {
    const home = homedir();

    const settingsFile = bobGlobalSettingsFile({ home });

    let configured = false;

    let hooksReady = false;

    try {
      const raw = readFileSync(settingsFile, 'utf8');

      const parsed = JSON.parse(raw);

      const hooks = (parsed?.hooks ?? {}) as Record<string, unknown>;

      const stopHooks = Array.isArray(hooks.Stop) ? hooks.Stop : [];

      hooksReady = stopHooks.some((hook: unknown) => {
        try {
          return JSON.stringify(hook).includes('hook ibm-bob');
        } catch {
          return false;
        }
      });

      configured = true;
    } catch {
      configured = false;
    }

    return {
      detected: true,

      configured,

      hooksReady,
    };
  } catch (error) {
    return {
      detected: false,

      configured: false,

      hooksReady: false,

      error: error instanceof Error ? error.message : String(error),
    };
  }
}
