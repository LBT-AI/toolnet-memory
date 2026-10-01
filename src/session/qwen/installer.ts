import { installQwenHooks, type QwenHookInstallOptions } from './hook-installer.js';

export type QwenInstallOptions = QwenHookInstallOptions;

export interface QwenInstallResult {
  hooksFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionEndInstalled: boolean;
}

export function installQwenIntegration(options: QwenInstallOptions = {}): QwenInstallResult {
  const result = installQwenHooks(options);

  return {
    hooksFile: result.hooksFile,

    changed: result.changed,

    stopInstalled: result.stopInstalled,

    sessionEndInstalled: result.sessionEndInstalled,
  };
}
