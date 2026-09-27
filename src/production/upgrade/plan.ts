/*
 * Phase 84C — the upgrade planner.
 *
 * Pure and deterministic: same observations and same build identities always
 * produce the same plan, with the same ordering, in the same process or a
 * different one.
 *
 * The planner never touches a store. It asks the 84B compatibility model what
 * each observed store is, asks the migration registry whether a legacy
 * authority store can move forward, and answers with an ordered set of actions.
 * Anything it cannot answer safely becomes a blocker, never a guess.
 */

import { checkStoreCompatibility, storeContract } from '../../storage/compatibility/index.js';

import { AUTHORITY_MIGRATIONS, authorityMigrationFor } from './migrations.js';
import { compareBuilds } from './fingerprint.js';

import type { BuildDescriptor } from './fingerprint.js';
import type { AuthorityMigration } from './migrations.js';
import type {
  StoreObservation,
  StoreUpgradeAction,
  StoreUpgradeActionEntry,
  UpgradeBlockerCode,
  UpgradePlan,
  UpgradeWarningCode,
} from './types.js';
import type { StoreContractDeclaration } from '../../storage/compatibility/index.js';

export interface UpgradePlanRequest {
  observations: readonly StoreObservation[];
  /**
   * Runtime build identity before and after the upgrade.
   *
   * Optional so the planner can also be used to inspect existing state; when
   * omitted, no build drift is assumed and no derived store is rebuilt.
   */
  builds?: { before: BuildDescriptor; after: BuildDescriptor };
  migrations?: readonly AuthorityMigration[];
}

/** Internal classification of one store, before de-duplication. */
interface Classification {
  entry: StoreUpgradeActionEntry;
  blockers: UpgradeBlockerCode[];
  warnings: UpgradeWarningCode[];
}

/*
 * Severity order used when the same store kind is observed more than once.
 * The most severe treatment wins, so a duplicate observation can never soften
 * a block into a rebuild.
 */
const SEVERITY: Record<StoreUpgradeAction, number> = {
  block: 5,
  migrate: 4,
  rebuild: 3,
  compatible: 2,
  ignore_ephemeral: 1,
};

function contractFor(kind: string): StoreContractDeclaration | undefined {
  try {
    return storeContract(kind as StoreContractDeclaration['kind']);
  } catch {
    return undefined;
  }
}

function authorityAction(
  result: ReturnType<typeof checkStoreCompatibility>,
  migrations: readonly AuthorityMigration[]
): Classification {
  if (result.status === 'compatible' || result.status === 'migrated') {
    return {
      entry: {
        kind: result.kind,
        storeClass: result.storeClass,
        action: 'compatible',
        reasonCode: result.reasonCode,
        requiresBackup: false,
      },
      blockers: [],
      warnings: [],
    };
  }

  const detectedVersion = result.detectedVersion;
  const migration =
    detectedVersion === undefined
      ? undefined
      : authorityMigrationFor(String(result.kind), detectedVersion, migrations);

  if (migration) {
    return {
      entry: {
        kind: result.kind,
        storeClass: result.storeClass,
        action: 'migrate',
        reasonCode: 'AUTHORITY_MIGRATION_REQUIRED',
        requiresBackup: true,
        migrationId: migration.id,
        detail: migration.description,
      },
      blockers: [],
      warnings: ['UPGRADE_AUTHORITY_MIGRATION_REQUIRED'],
    };
  }

  return {
    entry: {
      kind: result.kind,
      storeClass: result.storeClass,
      action: 'block',
      reasonCode: result.reasonCode,
      requiresBackup: false,
      ...(result.detail !== undefined ? { detail: result.detail } : {}),
    },
    blockers: [
      result.reasonCode === 'STORE_SCHEMA_UNSUPPORTED'
        ? 'UPGRADE_AUTHORITY_UNSUPPORTED'
        : 'UPGRADE_AUTHORITY_MIGRATION_MISSING',
    ],
    warnings: [],
  };
}

function derivedAction(
  result: ReturnType<typeof checkStoreCompatibility>,
  buildChanged: boolean
): Classification {
  const contract = contractFor(String(result.kind));

  const rebuildRequired =
    result.status === 'rebuild_required' ||
    (buildChanged && contract?.compatibility === 'rebuild_required');

  if (rebuildRequired) {
    return {
      entry: {
        kind: result.kind,
        storeClass: result.storeClass,
        action: 'rebuild',
        reasonCode: 'DERIVED_STORE_REBUILD_REQUIRED',
        requiresBackup: false,
        ...(result.detail !== undefined ? { detail: result.detail } : {}),
      },
      blockers: [],
      warnings: [],
    };
  }

  /*
   * A backward-compatible derived store (today: the resolution snapshot) is
   * readable as-is. Its reader normalizes legacy values in memory, so a rebuild
   * is representable but never required — which is why this store must never
   * grow a destructive migration.
   */
  if (contract?.compatibility === 'backward_compatible') {
    return {
      entry: {
        kind: result.kind,
        storeClass: result.storeClass,
        action: 'compatible',
        reasonCode: result.reasonCode,
        requiresBackup: false,
        ...(buildChanged ? { rebuildOptional: true } : {}),
        ...(buildChanged
          ? { detail: 'legacy values are normalized in memory; a rebuild is optional' }
          : {}),
      },
      blockers: [],
      warnings: buildChanged ? ['UPGRADE_DERIVED_REBUILD_OPTIONAL'] : [],
    };
  }

  return {
    entry: {
      kind: result.kind,
      storeClass: result.storeClass,
      action: 'compatible',
      reasonCode: result.reasonCode,
      requiresBackup: false,
    },
    blockers: [],
    warnings: [],
  };
}

function classify(
  observation: StoreObservation,
  buildChanged: boolean,
  migrations: readonly AuthorityMigration[]
): Classification {
  const result = checkStoreCompatibility({
    kind: observation.kind,
    ...(observation.detectedVersion !== undefined
      ? { detectedVersion: observation.detectedVersion }
      : {}),
    normalized: observation.normalized === true,
  });

  if (result.storeClass === 'unknown') {
    return {
      entry: {
        kind: result.kind,
        storeClass: 'unknown',
        action: 'block',
        reasonCode: 'STORE_UNKNOWN',
        requiresBackup: false,
        detail: result.detail ?? 'no declared store contract',
      },
      blockers: ['UPGRADE_STORE_UNKNOWN'],
      warnings: [],
    };
  }

  if (result.storeClass === 'ephemeral') {
    return {
      entry: {
        kind: result.kind,
        storeClass: result.storeClass,
        action: 'ignore_ephemeral',
        reasonCode: result.reasonCode,
        requiresBackup: false,
      },
      blockers: [],
      warnings: [],
    };
  }

  if (result.storeClass === 'derived') {
    return derivedAction(result, buildChanged);
  }

  return authorityAction(result, migrations);
}

function moreSevere(left: Classification, right: Classification): Classification {
  const winner = SEVERITY[right.entry.action] > SEVERITY[left.entry.action] ? right : left;

  return {
    entry: winner.entry,
    blockers: [...new Set([...left.blockers, ...right.blockers])].sort(),
    warnings: [...new Set([...left.warnings, ...right.warnings])].sort(),
  };
}

/** Deterministic observation order: by kind, then oldest schema first. */
function compareObservations(left: StoreObservation, right: StoreObservation): number {
  const byKind = left.kind.localeCompare(right.kind);

  if (byKind !== 0) {
    return byKind;
  }

  return (left.detectedVersion ?? -1) - (right.detectedVersion ?? -1);
}

export function buildUpgradePlan(request: UpgradePlanRequest): UpgradePlan {
  const migrations = request.migrations ?? AUTHORITY_MIGRATIONS;

  const drift = request.builds ? compareBuilds(request.builds.before, request.builds.after) : null;

  const buildChanged = drift?.changed ?? false;

  const byKind = new Map<string, Classification>();

  for (const observation of [...request.observations].sort(compareObservations)) {
    const classification = classify(observation, buildChanged, migrations);
    const existing = byKind.get(observation.kind);

    byKind.set(observation.kind, existing ? moreSevere(existing, classification) : classification);
  }

  const classifications = [...byKind.values()];

  const stores = classifications
    .map((classification) => classification.entry)
    .sort((left, right) => left.kind.localeCompare(right.kind));

  const blockers = [...new Set(classifications.flatMap((item) => item.blockers))].sort();

  const warnings = new Set<UpgradeWarningCode>(classifications.flatMap((item) => item.warnings));

  if (buildChanged) {
    warnings.add('UPGRADE_BUILD_FINGERPRINT_CHANGED');
  }

  const daemonRestartRequired = buildChanged;

  if (daemonRestartRequired) {
    warnings.add('UPGRADE_DAEMON_RESTART_REQUIRED');
  }

  const kindsWithAction = (action: StoreUpgradeAction): string[] =>
    stores.filter((store) => store.action === action).map((store) => store.kind);

  const migrationsToRun = [
    ...new Set(
      stores
        .filter((store) => store.action === 'migrate' && store.migrationId !== undefined)
        .map((store) => store.migrationId as string)
    ),
  ].sort();

  return {
    stores,
    daemonRestartRequired,
    rebuilds: kindsWithAction('rebuild'),
    migrations: migrationsToRun,
    ephemeral: kindsWithAction('ignore_ephemeral'),
    blockers,
    warnings: [...warnings].sort(),
    complete: blockers.length === 0,
  };
}
