import { existsSync, readFileSync } from 'node:fs';

import { junieConfigFile } from './config-paths.js';

import {
  getJunieCaptureMode,
  getJunieCapabilities,
  getJunieGaClass,
  getJunieRefreshMode,
  resolveJunieCapability,
  type JunieCapabilityResult,
} from './capability.js';

import type { IntegrationCapabilities } from '../integration-capabilities.js';

export interface JunieIntegrationStatus {
  binaryDetected: boolean;

  version: string | null;

  configReady: boolean;

  hooksConfigured: boolean;

  configFile: string;

  capabilities: IntegrationCapabilities;

  hooksAvailable: boolean;

  automaticCaptureSupported: boolean;

  captureMode: 'hook' | 'blocked-capability';

  capabilityReason: string;

  gaClass: 'AUTO_NATIVE' | 'MANUAL_RECOVERY' | 'BLOCKED';

  refreshMode: 'native-lifecycle' | 'native-session' | 'blocked';
}

export interface InspectJunieStatusOptions {
  capability?: JunieCapabilityResult;

  configFile?: string;
}

export function inspectJunieStatus(
  options: InspectJunieStatusOptions = {}
): JunieIntegrationStatus {
  const capability = options.capability ?? resolveJunieCapability();

  const configFile = options.configFile ?? junieConfigFile();
  const configReady = existsSync(configFile);

  let hooksConfigured = false;

  if (configReady) {
    try {
      hooksConfigured = readFileSync(configFile, 'utf8').includes('session:junie-hook');
    } catch {
      hooksConfigured = false;
    }
  }

  return {
    binaryDetected: capability.detected,
    version: capability.version,
    configReady,
    hooksConfigured,
    configFile,
    capabilities: getJunieCapabilities(capability),
    hooksAvailable: capability.hooksAvailable,
    automaticCaptureSupported: capability.automaticCaptureSupported,
    captureMode: getJunieCaptureMode(capability),
    capabilityReason: capability.capabilityReason,
    gaClass: getJunieGaClass(capability),
    refreshMode: getJunieRefreshMode(capability),
  };
}
