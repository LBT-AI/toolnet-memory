import { spawnSync } from 'node:child_process';

import {
  BLOCKED_CAPABILITIES,
  NATIVE_LIFECYCLE_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

/**
 * Junie 1468.30 is the stable build verified on this host. Its config
 * serializer has no `hooks` field, so lifecycle hooks are not available.
 * Hooks are an EAP/preview surface. No machine-verifiable hook-capability
 * signal has been verified for EAP builds, so do not infer hook support from
 * a version string: every build without explicit verified evidence fails
 * closed.
 */
const JUNIE_STABLE_WITHOUT_HOOKS: ReadonlySet<string> = new Set(['1468.30']);

export type JunieHookStability = 'stable' | 'eap' | 'unverified' | 'unknown';

export type JunieCaptureMode = 'hook' | 'blocked-capability';

export interface JunieCapabilityProbeResult {
  detected: boolean;
  version: string | null;
}

export interface JunieCapabilityOptions {
  /** Injectable binary probe for deterministic tests. */
  probe?: () => JunieCapabilityProbeResult;

  /**
   * Explicit evidence that the installed build supports the documented hook
   * contract. Production callers never set this; a future verified EAP build
   * may supply evidence from a real capability probe.
   */
  hookEvidence?: 'verified-eap-hooks';
}

export interface JunieCapabilityResult {
  detected: boolean;
  version: string | null;
  hooksAvailable: boolean;
  hooksStability: JunieHookStability;
  automaticCaptureSupported: boolean;
  captureMode: JunieCaptureMode;
  fallbackMode: 'blocked-capability';
  manualRecoveryAvailable: boolean;
  capabilityReason: string;
  gaClass: 'AUTO_NATIVE' | 'MANUAL_RECOVERY' | 'BLOCKED';
  refreshMode: 'native-lifecycle' | 'native-session' | 'blocked';
  sessionIdModel: 'deterministic' | 'unknown';
  projectModel: 'cwd-based' | 'unknown';
  resumeModel: 'flag-based' | 'unknown';
  sessionStorage: 'sessions-directory-unverified' | 'unknown';
}

function parseJunieVersion(versionOutput: string): string | null {
  const match = versionOutput.match(/Junie version:\s*([0-9A-Za-z._+-]+)/);
  return match?.[1] ?? null;
}

function probeJunieBinary(): JunieCapabilityProbeResult {
  const detected =
    spawnSync('sh', ['-lc', 'command -v junie >/dev/null 2>&1'], {
      stdio: 'ignore',
      timeout: 5_000,
    }).status === 0;

  if (!detected) {
    return { detected: false, version: null };
  }

  const versionResult = spawnSync('junie', ['--version'], {
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
    timeout: 5_000,
  });

  if (versionResult.status !== 0) {
    return { detected: true, version: null };
  }

  return {
    detected: true,
    version: parseJunieVersion(versionResult.stdout),
  };
}

function blockedCapability(
  detected: boolean,
  version: string | null,
  reason: string,
  hooksStability: JunieHookStability
): JunieCapabilityResult {
  return {
    detected,
    version,
    hooksAvailable: false,
    hooksStability,
    automaticCaptureSupported: false,
    captureMode: 'blocked-capability',
    fallbackMode: 'blocked-capability',
    manualRecoveryAvailable: false,
    capabilityReason: reason,
    gaClass: 'BLOCKED',
    refreshMode: 'blocked',
    sessionIdModel: detected ? 'deterministic' : 'unknown',
    projectModel: detected ? 'cwd-based' : 'unknown',
    resumeModel: detected ? 'flag-based' : 'unknown',
    sessionStorage: detected ? 'sessions-directory-unverified' : 'unknown',
  };
}

export function resolveJunieCapability(
  options: JunieCapabilityOptions = {}
): JunieCapabilityResult {
  const probe = options.probe ?? probeJunieBinary;
  const { detected, version } = probe();

  if (!detected) {
    return blockedCapability(false, null, 'junie-binary-not-found', 'unknown');
  }

  if (!version) {
    return blockedCapability(true, null, 'junie-version-unparseable', 'unknown');
  }

  if (JUNIE_STABLE_WITHOUT_HOOKS.has(version)) {
    return blockedCapability(
      true,
      version,
      `lifecycle-hooks-unavailable-on-stable-build-${version}`,
      'stable'
    );
  }

  if (options.hookEvidence === 'verified-eap-hooks') {
    return {
      detected: true,
      version,
      hooksAvailable: true,
      hooksStability: 'eap',
      automaticCaptureSupported: true,
      captureMode: 'hook',
      fallbackMode: 'blocked-capability',
      manualRecoveryAvailable: false,
      capabilityReason: 'verified-eap-hook-capability',
      gaClass: 'AUTO_NATIVE',
      refreshMode: 'native-lifecycle',
      sessionIdModel: 'deterministic',
      projectModel: 'cwd-based',
      resumeModel: 'flag-based',
      sessionStorage: 'sessions-directory-unverified',
    };
  }

  return blockedCapability(true, version, 'unverified-eap-hook-support', 'unverified');
}

export function getJunieCaptureMode(capability: JunieCapabilityResult): JunieCaptureMode {
  return capability.captureMode;
}

export function getJunieCapabilities(capability: JunieCapabilityResult): IntegrationCapabilities {
  return capability.hooksAvailable
    ? { ...NATIVE_LIFECYCLE_CAPABILITIES }
    : { ...BLOCKED_CAPABILITIES };
}

export function getJunieRefreshMode(
  capability: JunieCapabilityResult
): 'native-lifecycle' | 'native-session' | 'blocked' {
  return capability.refreshMode;
}

export function getJunieGaClass(
  capability: JunieCapabilityResult
): 'AUTO_NATIVE' | 'MANUAL_RECOVERY' | 'BLOCKED' {
  return capability.gaClass;
}
