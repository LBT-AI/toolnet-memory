import { installRovoHooks, type RovoHookInstallOptions } from './hook-installer.js';

export type RovoInstallOptions = RovoHookInstallOptions;

export interface RovoInstallResult {
  configFile: string;

  changed: boolean;

  hookInstalled: boolean;
}

export function installRovoIntegration(options: RovoInstallOptions = {}): RovoInstallResult {
  const result = installRovoHooks(options);

  return {
    configFile: result.configFile,
    changed: result.changed,
    hookInstalled: result.hookInstalled,
  };
}
