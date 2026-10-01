import { installGooseHooks, type GooseHookInstallOptions } from './hook-installer.js';

export type GooseInstallOptions = GooseHookInstallOptions;

export interface GooseInstallResult {
  hooksFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionEndInstalled: boolean;
}

export function installGooseIntegration(options: GooseInstallOptions = {}): GooseInstallResult {
  const result = installGooseHooks(options);

  return {
    hooksFile: result.hooksFile,

    changed: result.changed,

    stopInstalled: result.stopInstalled,

    sessionEndInstalled: result.sessionEndInstalled,
  };
}
