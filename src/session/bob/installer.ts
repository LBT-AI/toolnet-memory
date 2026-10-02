import { installBobHooks, type BobHookInstallOptions } from './hook-installer.js';

export type BobInstallOptions = BobHookInstallOptions;

export interface BobInstallResult {
  settingsFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionStartInstalled: boolean;
}

export function installBobIntegration(options: BobInstallOptions = {}): BobInstallResult {
  const result = installBobHooks(options);

  return {
    settingsFile: result.settingsFile,

    changed: result.changed,

    stopInstalled: result.stopInstalled,

    sessionStartInstalled: result.sessionStartInstalled,
  };
}
