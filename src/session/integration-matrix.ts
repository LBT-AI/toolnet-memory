import {
  AGENT_INTEGRATION_CAPABILITIES,
  REQUIRED_HOOK_EVENTS,
  SUPPORTED_INTEGRATION_AGENTS,
  type IntegrationCaptureMode,
  type IntegrationRefreshMode,
  type SupportedIntegrationAgent,
} from './integration-capabilities.js';

import {
  getJunieCaptureMode,
  getJunieGaClass,
  getJunieRefreshMode,
  resolveJunieCapability,
  type JunieCapabilityResult,
} from './junie/capability.js';

/**
 * Phase 86F — canonical integration matrix.
 *
 * Single derivation point for everything that counts integrations: GA
 * certification, README verification, release-manifest verification, and
 * the final matrix output. Nothing here hardcodes an agent count; a new
 * registry entry flows into every consumer automatically.
 *
 * There is deliberately NO agent alias model: every supported product
 * identity is its own canonical adapter (Amazon Q/Kiro-style rebrands,
 * legacy names, and binary aliases are not represented anywhere in the
 * registry, so the support count cannot be inflated by aliases).
 */

export type GaCertificationClass =
  | 'AUTO_NATIVE'
  | 'AUTO_PERSISTENT_PLUGIN'
  | 'AUTO_MANAGED_WRAPPER'
  | 'MANUAL_RECOVERY'
  | 'MCP_ONLY'
  | 'BLOCKED';

/**
 * Certification class is driven by capture mode (how session events
 * actually reach ToolNet), not by refresh mode alone: a native-lifecycle
 * host that requires an explicit sync command is not zero-touch.
 */
export function gaCertificationClassFor(
  refreshMode: IntegrationRefreshMode,
  captureMode: IntegrationCaptureMode
): GaCertificationClass {
  if (captureMode === 'blocked-product-identity' || captureMode === 'blocked-capability') {
    return 'BLOCKED';
  }

  if (captureMode === 'mcp-only') {
    return 'MCP_ONLY';
  }

  if (captureMode === 'manual-sync') {
    return 'MANUAL_RECOVERY';
  }

  if (captureMode === 'managed-wrapper-session-end') {
    return 'AUTO_MANAGED_WRAPPER';
  }

  if (captureMode === 'native-auto-with-source-resolution') {
    return 'AUTO_NATIVE';
  }

  if (refreshMode === 'persistent-plugin') {
    return 'AUTO_PERSISTENT_PLUGIN';
  }

  return 'AUTO_NATIVE';
}

export interface IntegrationMatrixRow {
  agent: SupportedIntegrationAgent;
  refreshMode: IntegrationRefreshMode;
  captureMode: IntegrationCaptureMode;
  gaClass: GaCertificationClass;
  auto: boolean;
  hookEvents: readonly string[];

  /** Static contract depends on a runtime capability check (Junie). */
  conditional?: boolean;

  /** Row was resolved against the current host/build capability. */
  runtimeResolved?: boolean;

  capabilityReason?: string;
}

export function buildIntegrationMatrix(): IntegrationMatrixRow[] {
  return SUPPORTED_INTEGRATION_AGENTS.map((agent) => {
    const capabilities = AGENT_INTEGRATION_CAPABILITIES[agent];
    const gaClass = gaCertificationClassFor(capabilities.refreshMode, capabilities.captureMode);

    return {
      agent,
      refreshMode: capabilities.refreshMode,
      captureMode: capabilities.captureMode,
      gaClass,
      auto:
        gaClass === 'AUTO_NATIVE' ||
        gaClass === 'AUTO_PERSISTENT_PLUGIN' ||
        gaClass === 'AUTO_MANAGED_WRAPPER',
      hookEvents: [...REQUIRED_HOOK_EVENTS[agent]],
      ...(capabilities.conditionalCapture ? { conditional: true } : {}),
    };
  });
}

export interface RuntimeMatrixOptions {
  /** Injectable Junie capability so tests do not depend on the host binary. */
  junieCapability?: JunieCapabilityResult;
}

/**
 * Resolve product-level conditional capture against the current build.
 * Static rows describe the capable contract; runtime rows must never keep an
 * unconditional AUTO claim when the installed build cannot satisfy it.
 */
export function buildRuntimeIntegrationMatrix(
  options: RuntimeMatrixOptions = {}
): IntegrationMatrixRow[] {
  const junieCapability = options.junieCapability ?? resolveJunieCapability();
  const junieGaClass = getJunieGaClass(junieCapability);

  return buildIntegrationMatrix().map((row) => {
    if (row.agent !== 'junie') {
      return row;
    }

    return {
      ...row,
      refreshMode: getJunieRefreshMode(junieCapability),
      captureMode: getJunieCaptureMode(junieCapability),
      gaClass: junieGaClass,
      auto: junieGaClass === 'AUTO_NATIVE',
      hookEvents: junieCapability.hooksAvailable ? [...REQUIRED_HOOK_EVENTS.junie] : [],
      conditional: true,
      runtimeResolved: true,
      capabilityReason: junieCapability.capabilityReason,
    };
  });
}

export interface IntegrationMatrixCounts {
  canonical: number;
  autoNative: number;
  autoPersistentPlugin: number;
  autoManagedWrapper: number;
  manualRecovery: number;
  mcpOnly: number;
  blocked: number;
}

export function countIntegrationMatrix(rows: IntegrationMatrixRow[]): IntegrationMatrixCounts {
  const byClass = (gaClass: GaCertificationClass): number =>
    rows.filter((row) => row.gaClass === gaClass).length;

  return {
    canonical: rows.length,
    autoNative: byClass('AUTO_NATIVE'),
    autoPersistentPlugin: byClass('AUTO_PERSISTENT_PLUGIN'),
    autoManagedWrapper: byClass('AUTO_MANAGED_WRAPPER'),
    manualRecovery: byClass('MANUAL_RECOVERY'),
    mcpOnly: byClass('MCP_ONLY'),
    blocked: byClass('BLOCKED'),
  };
}
