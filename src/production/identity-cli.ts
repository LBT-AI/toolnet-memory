/*
 * Phase 84D1 — packaged build identity probe.
 *
 * Prints what the runtime actually is, read from the runtime itself rather than
 * from the source tree: the build identity a client and a daemon must agree on,
 * plus the capability inventory that proves which phase work this artifact
 * contains.
 *
 * The inventory is not decoration. A packaged artifact is minified, so grepping
 * it for identifiers proves nothing; asking it to classify a store and to plan an
 * upgrade proves the code is present AND executable. `npm run phase84d1:certify`
 * probes the built bundle through this command.
 */

import { daemonBuildFingerprint } from '../daemon/fingerprint.js';
import { daemonRuntimeRoot } from '../daemon/paths.js';
import { DAEMON_PROTOCOL_VERSION } from '../daemon/types.js';
import { resolveBuildMarker, resolvePackageVersion } from '../runtime/build-identity.js';
import {
  STORE_CONTRACTS,
  checkStoreCompatibility,
  storeContract,
  storeKindsByClass,
} from '../storage/compatibility/index.js';

import { orderedPhases } from './upgrade/order.js';
import { buildUpgradePlan } from './upgrade/plan.js';

export interface RuntimeIdentityReport {
  identity: {
    packageVersion: string;
    packageVersionSource: string;
    buildMarker: string;
    buildMarkerSource: string;
    protocolVersion: number;
    buildHash: string;
    runtimeRoot: string;
    schema: Record<string, string>;
  };
  capabilities: {
    storage: {
      contracts: number;
      authority: number;
      derived: number;
      ephemeral: number;
      legacyValueDomains: readonly string[];
    };
    compatibilityProbe: {
      status: string;
      reasonCode: string;
    };
    upgrade: {
      phases: readonly string[];
      legacyAuthorityBlocker: string | undefined;
    };
  };
}

/** Build the report without printing it, so it is directly testable. */
export function runtimeIdentityReport(runtimeRoot = daemonRuntimeRoot()): RuntimeIdentityReport {
  const version = resolvePackageVersion();
  const marker = resolveBuildMarker();
  const fingerprint = daemonBuildFingerprint(runtimeRoot);

  const compatibility = checkStoreCompatibility({
    kind: 'resolution_snapshot',
    normalized: true,
  });

  const upgradePlan = buildUpgradePlan({
    observations: [{ kind: 'memory_records', detectedVersion: 0 }],
  });

  return {
    identity: {
      packageVersion: version.value,
      packageVersionSource: version.source,
      buildMarker: marker.value,
      buildMarkerSource: marker.source,
      protocolVersion: DAEMON_PROTOCOL_VERSION,
      buildHash: fingerprint.buildHash,
      runtimeRoot,
      schema: { ...fingerprint.schema },
    },
    capabilities: {
      storage: {
        contracts: STORE_CONTRACTS.length,
        authority: storeKindsByClass('authority').length,
        derived: storeKindsByClass('derived').length,
        ephemeral: storeKindsByClass('ephemeral').length,
        legacyValueDomains: storeContract('resolution_snapshot').legacyValueDomains,
      },
      compatibilityProbe: {
        status: compatibility.status,
        reasonCode: compatibility.reasonCode,
      },
      upgrade: {
        phases: orderedPhases(),
        legacyAuthorityBlocker: upgradePlan.blockers[0],
      },
    },
  };
}

function main(): void {
  process.stdout.write(`${JSON.stringify(runtimeIdentityReport(), null, 2)}\n`);
}

main();
