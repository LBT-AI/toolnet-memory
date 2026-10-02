import { installClineHooks, type ClineHookInstallOptions } from './hook-installer.js';

export type ClineInstallOptions = ClineHookInstallOptions;

export interface ClineInstallResult {
  hooksFile: string;

  hooksDir: string;

  changed: boolean;

  taskCompleteInstalled: boolean;

  taskStartInstalled: boolean;
}

export function installClineIntegration(options: ClineInstallOptions = {}): ClineInstallResult {
  const result = installClineHooks(options);

  return {
    hooksFile: result.hooksFile,
    hooksDir: result.hooksDir,
    changed: result.changed,
    taskCompleteInstalled: result.taskCompleteInstalled,
    taskStartInstalled: result.taskStartInstalled,
  };
}
