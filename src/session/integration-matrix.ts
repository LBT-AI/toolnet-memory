import {
  AGENT_INTEGRATION_CAPABILITIES,
  REQUIRED_HOOK_EVENTS,
  SUPPORTED_INTEGRATION_AGENTS,
  type IntegrationCaptureMode,
  type IntegrationRefreshMode,
  type SupportedIntegrationAgent,
} from './integration-capabilities.js';

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
