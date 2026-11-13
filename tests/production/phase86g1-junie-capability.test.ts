/*
 * Phase 86G.1 — Junie capability truth.
 *
 * Stable Junie 1468.30 does not expose the lifecycle-hook contract. The
 * runtime resolver must fail closed, the installer must not touch user
 * config, and status/doctor/README/manifest must agree. Markers:
 *
 *   PHASE86G1_JUNIE_CAPABILITY_TRUTH=PASS
 *   FALSE_AUTO_COUNT=0
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getJunieCapabilities,
  getJunieCaptureMode,
  getJunieGaClass,
  getJunieRefreshMode,
  resolveJunieCapability,
  type JunieCapabilityResult,
} from '../../src/session/junie/capability.js';

import { installJunieHooks } from '../../src/session/junie/hook-installer.js';
import { inspectJunieStatus } from '../../src/session/junie/status.js';

import { installAutoIntegrations } from '../../src/production/auto-integrate.js';

import type { AgentDetection } from '../../src/production/integration-detection.js';

import {
  AGENT_INTEGRATION_CAPABILITIES,
  SUPPORTED_INTEGRATION_AGENTS,
} from '../../src/session/integration-capabilities.js';

import {
  buildIntegrationMatrix,
  buildRuntimeIntegrationMatrix,
  countIntegrationMatrix,
} from '../../src/session/integration-matrix.js';

const STABLE_REASON = 'lifecycle-hooks-unavailable-on-stable-build-1468.30';
const MARKER = 'PHASE86G1_JUNIE_CAPABILITY_TRUTH=PASS';

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function stableCapability(): JunieCapabilityResult {
  return resolveJunieCapability({
    probe: () => ({ detected: true, version: '1468.30' }),
  });
}

function eapCapability(): JunieCapabilityResult {
  return resolveJunieCapability({
    probe: () => ({ detected: true, version: '9999.1-eap' }),
    hookEvidence: 'verified-eap-hooks',
  });
}

function junieDetection(detected: boolean): AgentDetection {
  return {
    agent: 'junie',
    detected,
    commandDetected: detected,
    configDetected: false,
    evidence: detected ? ['command:junie'] : [],
  };
}

describe('Phase 86G.1 — J1/J2/J3 stable resolver', () => {
  it('J1: no Junie binary fails closed', () => {
    const capability = resolveJunieCapability({
      probe: () => ({ detected: false, version: null }),
    });

    expect(capability.detected).toBe(false);
    expect(capability.version).toBeNull();
    expect(capability.hooksAvailable).toBe(false);
    expect(capability.hooksStability).toBe('unknown');
    expect(capability.capabilityReason).toBe('junie-binary-not-found');
    expect(capability.captureMode).toBe('blocked-capability');
    expect(capability.automaticCaptureSupported).toBe(false);
    expect(capability.gaClass).toBe('BLOCKED');

    const auto = installAutoIntegrations({
      detections: [junieDetection(false)],
    }).find((result) => result.agent === 'junie')!;

    expect(auto.detected).toBe(false);
    expect(auto.installed).toBe(false);
    expect(auto.targets).toEqual([]);
  });

  it('J2: detects stable 1468.30 without guessing hooks', () => {
    const capability = stableCapability();

    expect(capability.detected).toBe(true);
    expect(capability.version).toBe('1468.30');
    expect(capability.hooksAvailable).toBe(false);
    expect(capability.hooksStability).toBe('stable');
    expect(capability.capabilityReason).toBe(STABLE_REASON);
    expect(capability.sessionIdModel).toBe('deterministic');
    expect(capability.projectModel).toBe('cwd-based');
    expect(capability.resumeModel).toBe('flag-based');
    expect(capability.sessionStorage).toBe('sessions-directory-unverified');
  });

  it('J3: stable fallback is blocked, not fake manual recovery', () => {
    const capability = stableCapability();
    const capabilities = getJunieCapabilities(capability);

    expect(capability.fallbackMode).toBe('blocked-capability');
    expect(capability.manualRecoveryAvailable).toBe(false);
    expect(getJunieCaptureMode(capability)).toBe('blocked-capability');
    expect(getJunieGaClass(capability)).toBe('BLOCKED');
    expect(getJunieRefreshMode(capability)).toBe('blocked');
    expect(capabilities.lifecycleHooks).toBe(false);
    expect(capabilities.nativeCapture).toBe(false);
    expect(capabilities.level).toBe('blocked');
  });
});

describe('Phase 86G.1 — J4/J11/J12 installer safety', () => {
  it('J4: refuses to install stable hooks and never creates config', () => {
    const configFile = join(tempRoot('toolnet-junie-refuse-'), 'config.json');

    const result = installJunieHooks({
      configFile,
      capability: stableCapability(),
      projectRoot: '/workspace/app',
    });

    expect(result.installed).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.events).toEqual([]);
    expect(result.fallbackAvailable).toBe(false);
    expect(result.reason).toBe(STABLE_REASON);
    expect(existsSync(configFile)).toBe(false);
  });

  it('J11: malformed existing config fails closed without rewriting it', () => {
    const configFile = join(tempRoot('toolnet-junie-malformed-'), 'config.json');
    const original = '{ not-json';
    writeFileSync(configFile, original);

    expect(() =>
      installJunieHooks({
        configFile,
        capability: eapCapability(),
        projectRoot: '/workspace/app',
      })
    ).toThrow(/Invalid existing Junie config/);

    expect(readFileSync(configFile, 'utf8')).toBe(original);
  });

  it('J12: stable refusal preserves an existing user hook config byte-for-byte', () => {
    const configFile = join(tempRoot('toolnet-junie-preserve-'), 'config.json');
    const original = JSON.stringify(
      {
        model: 'default',
        hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'keep' }] }] },
      },
      null,
      2
    );
    writeFileSync(configFile, original);

    const result = installJunieHooks({
      configFile,
      capability: stableCapability(),
      projectRoot: '/workspace/app',
    });

    expect(result.installed).toBe(false);
    expect(readFileSync(configFile, 'utf8')).toBe(original);
  });
});

describe('Phase 86G.1 — J5/J6 status and doctor truth', () => {
  it('J5: status reports blocked capability with the exact reason', () => {
    const configFile = join(tempRoot('toolnet-junie-status-'), 'config.json');
    writeFileSync(configFile, JSON.stringify({ hooks: {} }));

    const status = inspectJunieStatus({
      capability: stableCapability(),
      configFile,
    });

    expect(status.binaryDetected).toBe(true);
    expect(status.version).toBe('1468.30');
    expect(status.configReady).toBe(true);
    expect(status.hooksConfigured).toBe(false);
    expect(status.hooksAvailable).toBe(false);
    expect(status.automaticCaptureSupported).toBe(false);
    expect(status.captureMode).toBe('blocked-capability');
    expect(status.gaClass).toBe('BLOCKED');
    expect(status.refreshMode).toBe('blocked');
    expect(status.capabilityReason).toBe(STABLE_REASON);
    expect(status.capabilities.level).toBe('blocked');
  });

  it('J6: doctor renders Junie capability read-only and does not mark it healthy', () => {
    const doctor = readFileSync('src/production/doctor.ts', 'utf8');

    expect(doctor).toContain("from '../session/junie/status.js'");
    expect(doctor).toContain('inspectJunieStatus()');
    expect(doctor).toContain('unavailable on this build');
    expect(doctor).toContain('capabilityReason');
    expect(doctor).toContain('captureMode');
    expect(doctor).not.toContain('installJunieHooks');
  });
});

describe('Phase 86G.1 — J7/J8/J9/J10 capability gate', () => {
  it('J7: stable recovery is refused instead of guessed', () => {
    const cli = readFileSync('src/session/junie/cli.ts', 'utf8');

    expect(cli).toContain("capability.captureMode === 'blocked-capability'");
    expect(cli).toContain('recovered: false');
    expect(cli).toContain('process.exitCode = 1');
  });

  it('J8: verified EAP evidence enables the AUTO contract', () => {
    const capability = eapCapability();
    const capabilities = getJunieCapabilities(capability);

    expect(capability.hooksAvailable).toBe(true);
    expect(capability.hooksStability).toBe('eap');
    expect(capability.automaticCaptureSupported).toBe(true);
    expect(capability.fallbackMode).toBe('blocked-capability');
    expect(capability.manualRecoveryAvailable).toBe(false);
    expect(getJunieCaptureMode(capability)).toBe('hook');
    expect(getJunieGaClass(capability)).toBe('AUTO_NATIVE');
    expect(getJunieRefreshMode(capability)).toBe('native-lifecycle');
    expect(capabilities.lifecycleHooks).toBe(true);
    expect(capabilities.level).toBe('native-capture');
  });

  it('J9: AUTO appears only with verified hook evidence; runtime stable stays blocked', () => {
    const staticRows = buildIntegrationMatrix();
    const staticJunie = staticRows.find((row) => row.agent === 'junie')!;

    expect(staticJunie.gaClass).toBe('AUTO_NATIVE');
    expect(staticJunie.conditional).toBe(true);

    const stableRows = buildRuntimeIntegrationMatrix({
      junieCapability: stableCapability(),
    });
    const stableJunie = stableRows.find((row) => row.agent === 'junie')!;

    expect(stableJunie.gaClass).toBe('BLOCKED');
    expect(stableJunie.auto).toBe(false);
    expect(stableJunie.hookEvents).toEqual([]);
    expect(stableJunie.runtimeResolved).toBe(true);

    const eapRows = buildRuntimeIntegrationMatrix({ junieCapability: eapCapability() });
    const eapJunie = eapRows.find((row) => row.agent === 'junie')!;

    expect(eapJunie.gaClass).toBe('AUTO_NATIVE');
    expect(eapJunie.auto).toBe(true);
    expect(eapJunie.hookEvents).toEqual(['SessionStart', 'Stop', 'SessionEnd']);

    const falseAutoCount = stableRows.filter((row) => row.agent === 'junie' && row.auto).length;
    expect(falseAutoCount).toBe(0);
  });

  it('J10: unknown or unparseable versions fail closed', () => {
    const stableWithEvidence = resolveJunieCapability({
      probe: () => ({ detected: true, version: '1468.30' }),
      hookEvidence: 'verified-eap-hooks',
    });

    expect(stableWithEvidence.hooksAvailable).toBe(false);
    expect(stableWithEvidence.captureMode).toBe('blocked-capability');
    expect(stableWithEvidence.capabilityReason).toBe(STABLE_REASON);

    const unparseable = resolveJunieCapability({
      probe: () => ({ detected: true, version: null }),
    });
    const unknown = resolveJunieCapability({
      probe: () => ({ detected: true, version: '9999.0' }),
    });

    for (const capability of [unparseable, unknown]) {
      expect(capability.hooksAvailable).toBe(false);
      expect(capability.automaticCaptureSupported).toBe(false);
      expect(capability.captureMode).toBe('blocked-capability');
      expect(capability.gaClass).toBe('BLOCKED');
    }

    expect(unparseable.capabilityReason).toBe('junie-version-unparseable');
    expect(unknown.capabilityReason).toBe('unverified-eap-hook-support');
  });

  it('auto-integrate never installs stable hooks but installs verified EAP hooks', () => {
    const stableConfig = join(tempRoot('toolnet-junie-auto-stable-'), 'config.json');
    const stableResults = installAutoIntegrations({
      detections: [junieDetection(true)],
      junie: {
        capability: stableCapability(),
        configFile: stableConfig,
        projectRoot: '/workspace/app',
      },
    });
    const stableResult = stableResults.find((result) => result.agent === 'junie')!;

    expect(stableResult.installed).toBe(false);
    expect(stableResult.error).toContain(STABLE_REASON);
    expect(existsSync(stableConfig)).toBe(false);

    const eapConfig = join(tempRoot('toolnet-junie-auto-eap-'), 'config.json');
    const eapResults = installAutoIntegrations({
      detections: [junieDetection(true)],
      junie: {
        capability: eapCapability(),
        configFile: eapConfig,
        projectRoot: '/workspace/app',
      },
    });
    const eapResult = eapResults.find((result) => result.agent === 'junie')!;

    expect(eapResult.installed).toBe(true);
    expect(eapResult.targets).toEqual([eapConfig]);
    expect(JSON.stringify(JSON.parse(readFileSync(eapConfig, 'utf8')))).toContain(
      'session:junie-hook'
    );
  });
});

describe('Phase 86G.1 — matrix and documentation consistency', () => {
  it('reports static and current-host runtime matrices separately', () => {
    const staticCounts = countIntegrationMatrix(buildIntegrationMatrix());
    const runtimeCounts = countIntegrationMatrix(
      buildRuntimeIntegrationMatrix({ junieCapability: stableCapability() })
    );

    expect(staticCounts).toEqual({
      canonical: 27,
      autoNative: 17,
      autoPersistentPlugin: 1,
      autoManagedWrapper: 1,
      manualRecovery: 3,
      mcpOnly: 3,
      blocked: 2,
    });

    expect(runtimeCounts).toEqual({
      canonical: 27,
      autoNative: 16,
      autoPersistentPlugin: 1,
      autoManagedWrapper: 1,
      manualRecovery: 3,
      mcpOnly: 3,
      blocked: 3,
    });

    const falseAuto = buildRuntimeIntegrationMatrix({
      junieCapability: stableCapability(),
    }).filter((row) => row.auto && row.agent === 'junie');

    expect(falseAuto).toHaveLength(0);
    console.log('FALSE_AUTO_COUNT=0');
  });

  it('registry, README, and manifest agree on the conditional blocked fallback', () => {
    const registry = AGENT_INTEGRATION_CAPABILITIES.junie;

    expect(registry.conditionalCapture).toEqual({
      runtimeResolutionRequired: true,
      hookChannel: 'eap',
      stableFallback: 'blocked-capability',
      manualRecoveryAvailable: false,
      reason: 'lifecycle hooks require verified EAP capability; unverified builds fail closed',
    });

    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain('verified hook-capable EAP');
    expect(readme).toContain('stable builds report blocked capability');
    expect(readme).toContain('Manual recovery is not offered for stable Junie');
    expect(readme).not.toContain('falls back to **manual recovery**');

    const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8')) as {
      agents: Record<string, { conditionalCapability?: Record<string, unknown> }>;
    };
    expect(manifest.agents.junie.conditionalCapability).toMatchObject({
      runtimeResolutionRequired: true,
      hookChannel: 'eap',
      hooksRequireVerifiedCapability: true,
      stableFallback: 'blocked-capability',
      manualRecoveryAvailable: false,
      stableBuildExample: '1468.30',
      stableHasHooks: false,
    });

    const registryAgents = [...SUPPORTED_INTEGRATION_AGENTS].sort();
    expect(Object.keys(manifest.agents).sort()).toEqual(registryAgents);

    console.log(MARKER);
  });
});
