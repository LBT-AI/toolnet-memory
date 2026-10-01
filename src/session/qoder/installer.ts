import { installQoderHooks, type QoderHookInstallOptions } from './hook-installer.js';

export type QoderInstallOptions = QoderHookInstallOptions;

export interface QoderInstallResult {
  settingsFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionEndInstalled: boolean;
}

export function installQoderIntegration(options: QoderInstallOptions = {}): QoderInstallResult {
  const result = installQoderHooks(options);

  return {
    settingsFile: result.settingsFile,

    changed: result.changed,

    stopInstalled: result.stopInstalled,

    sessionEndInstalled: result.sessionEndInstalled,
  };
}
