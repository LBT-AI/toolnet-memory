import { installKimiHooks, type KimiHookInstallOptions } from './hook-installer.js';

export type KimiInstallOptions = KimiHookInstallOptions;

export interface KimiInstallResult {
  configFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionEndInstalled: boolean;
}

export function installKimiIntegration(options: KimiInstallOptions = {}): KimiInstallResult {
  const result = installKimiHooks(options);

  return {
    configFile: result.configFile,

    changed: result.changed,

    stopInstalled: result.stopInstalled,

    sessionEndInstalled: result.sessionEndInstalled,
  };
}
