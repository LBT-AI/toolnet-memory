import { installHermesHooks, type HermesHookInstallOptions } from './hook-installer.js';

export type HermesInstallOptions = HermesHookInstallOptions;

export interface HermesInstallResult {
  configFile: string;

  changed: boolean;

  sessionEndInstalled: boolean;
}

export function installHermesIntegration(options: HermesInstallOptions = {}): HermesInstallResult {
  const result = installHermesHooks(options);

  return {
    configFile: result.configFile,

    changed: result.changed,

    sessionEndInstalled: result.sessionEndInstalled,
  };
}
