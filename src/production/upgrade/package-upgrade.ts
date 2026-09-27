/*
 * Phase 84C — package upgrade orchestration.
 *
 * The flow a `toolnet-memory update` performs after the new package is on disk:
 *
 *   inspect the stores that exist
 *     -> build an upgrade plan
 *       -> refuse when the plan is blocked
 *         -> apply the safe migration/rebuild/cleanup work
 *           -> restart the daemon when the build identity changed
 *             -> verify
 *
 * There is no second updater: the package download stays in `update.ts`, and
 * everything that touches local state goes through here.
 *
 * On build identity: this module is handed the before/after descriptors by its
 * caller rather than deriving them, because the running process can only ever
 * observe the OLD schema fingerprints — the new ones belong to code that has
 * not been loaded yet. The honest consequence is a `package_version` drift
 * after every package upgrade, which is exactly when the daemon must restart.
 */

import { buildUpgradePlan } from './plan.js';
import { runUpgrade } from './run.js';

import type { BuildDescriptor } from './fingerprint.js';
import type { AuthorityMigration } from './migrations.js';
import type { StoreObservation, UpgradePlan, UpgradePorts, UpgradeResult } from './types.js';

export interface PackageUpgradeRequest {
  /** Stores as observed on disk; pass `[]` when no project is in scope. */
  observations: readonly StoreObservation[];
  /** Runtime build identity before the package swap. */
  before: BuildDescriptor;
  /** Runtime build identity the caller believes is now installed. */
  after: BuildDescriptor;
  ports: UpgradePorts;
  migrations?: readonly AuthorityMigration[];
  /** Defaults to true; an upgrade only runs when a caller opts in. */
  dryRun?: boolean;
}

export interface PackageUpgradeOutcome {
  plan: UpgradePlan;
  result: UpgradeResult;
  /** True when the caller may report the upgrade as successful. */
  ok: boolean;
}

export async function orchestratePackageUpgrade(
  request: PackageUpgradeRequest
): Promise<PackageUpgradeOutcome> {
  const plan = buildUpgradePlan({
    observations: request.observations,
    builds: { before: request.before, after: request.after },
    ...(request.migrations !== undefined ? { migrations: request.migrations } : {}),
  });

  const result = await runUpgrade(plan, request.ports, {
    dryRun: request.dryRun !== false,
  });

  return {
    plan,
    result,
    ok: result.outcome === 'planned' || result.outcome === 'applied',
  };
}
