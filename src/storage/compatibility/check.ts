/*
 * Phase 84B — storage compatibility model: the check.
 *
 * Pure and read-only. It never opens, rewrites or deletes a store: it answers
 * what this build may do with a payload it was handed. Authority data is never
 * silently rebuilt or dropped — an unreadable authority version blocks; derived
 * data is regenerated from its declared source of truth; an unknown store
 * blocks instead of being guessed at.
 */

import { storeContract } from './registry.js';

import type { StoreContractDeclaration } from './registry.js';

import type {
  StoreClassOrUnknown,
  StoreCompatibilityResult,
  StoreReasonCode,
  StoreStatus,
} from './types.js';

/** Minimal contract shape the decision needs. */
export type CompatibilityContract = Pick<
  StoreContractDeclaration,
  | 'kind'
  | 'storeClass'
  | 'schemaVersion'
  | 'supportedLegacyVersions'
  | 'compatibility'
  | 'missingVersionPolicy'
  | 'sourceOfTruth'
>;

export interface StoreCompatibilityInput {
  /** Version read from the payload, when the store carries one. */
  detectedVersion?: number;
  /** True when the owning reader rewrote legacy values in memory. */
  normalized?: boolean;
}

function build(
  contract: Pick<CompatibilityContract, 'kind' | 'storeClass' | 'schemaVersion'>,
  status: StoreStatus,
  reasonCode: StoreReasonCode,
  detectedVersion?: number,
  normalized = false,
  detail?: string
): StoreCompatibilityResult {
  return {
    kind: contract.kind,
    storeClass: contract.storeClass,
    status,
    reasonCode,
    schemaVersion: contract.schemaVersion,
    ...(detectedVersion !== undefined ? { detectedVersion } : {}),
    normalized,
    ...(detail !== undefined ? { detail } : {}),
  };
}

/**
 * Decide the compatibility status of one payload against one contract.
 *
 * Exported separately from the registry lookup so every branch of the model is
 * directly testable with real or synthetic contracts.
 */
export function decideStoreCompatibility(
  contract: CompatibilityContract,
  input: StoreCompatibilityInput = {}
): StoreCompatibilityResult {
  const { schemaVersion, supportedLegacyVersions, missingVersionPolicy, storeClass } = contract;
  const normalized = input.normalized === true;

  /* Derived and ephemeral data is regenerated, never migrated in place. */
  const rebuild = (detectedVersion: number | undefined, detail: string): StoreCompatibilityResult =>
    build(
      contract,
      'rebuild_required',
      'DERIVED_STORE_REBUILD_REQUIRED',
      detectedVersion,
      false,
      detail
    );

  /* No marker on the payload. */
  if (input.detectedVersion === undefined) {
    if (missingVersionPolicy === 'reject') {
      return build(
        contract,
        'blocked',
        'STORE_SCHEMA_UNSUPPORTED',
        undefined,
        false,
        'store payload carries no schema version marker'
      );
    }

    if (missingVersionPolicy === 'assume_legacy') {
      const assumed = supportedLegacyVersions[0] ?? schemaVersion;

      return decideStoreCompatibility(contract, {
        detectedVersion: assumed,
        normalized: normalized || assumed !== schemaVersion,
      });
    }

    /* `accept`: the store never carried a marker and the contract allows it. */
    return build(
      contract,
      normalized ? 'migrated' : 'compatible',
      normalized ? 'STORE_SCHEMA_LEGACY_COMPATIBLE' : 'STORE_SCHEMA_CURRENT',
      undefined,
      normalized,
      normalized ? 'legacy values normalized in memory' : undefined
    );
  }

  const detectedVersion = input.detectedVersion;

  /* Current schema. */
  if (detectedVersion === schemaVersion) {
    return build(
      contract,
      normalized ? 'migrated' : 'compatible',
      normalized ? 'STORE_SCHEMA_LEGACY_COMPATIBLE' : 'STORE_SCHEMA_CURRENT',
      detectedVersion,
      normalized,
      normalized ? 'legacy values normalized in memory' : undefined
    );
  }

  /* Supported legacy schema. */
  if (supportedLegacyVersions.includes(detectedVersion)) {
    if (normalized) {
      return build(
        contract,
        'migrated',
        'STORE_SCHEMA_LEGACY_COMPATIBLE',
        detectedVersion,
        true,
        'legacy values normalized in memory'
      );
    }

    if (storeClass === 'authority') {
      return build(
        contract,
        'blocked',
        'STORE_MIGRATION_REQUIRED',
        detectedVersion,
        false,
        `authority store at legacy schema v${detectedVersion} requires an explicit migration`
      );
    }

    return rebuild(
      detectedVersion,
      `legacy schema v${detectedVersion} is regenerated from ${contract.sourceOfTruth}`
    );
  }

  /* A version from the future: never interpreted, never guessed at. */
  if (detectedVersion > schemaVersion) {
    if (storeClass === 'authority') {
      return build(
        contract,
        'blocked',
        'STORE_SCHEMA_UNSUPPORTED',
        detectedVersion,
        false,
        `authority store was written by a newer schema (v${detectedVersion})`
      );
    }

    return rebuild(
      detectedVersion,
      `schema v${detectedVersion} is newer than this build understands`
    );
  }

  /* An older, unmapped version. */
  if (storeClass === 'authority') {
    return build(
      contract,
      'blocked',
      'AUTHORITY_MIGRATION_REQUIRED',
      detectedVersion,
      false,
      `authority store at unsupported schema v${detectedVersion} requires a migration before use`
    );
  }

  return rebuild(
    detectedVersion,
    `unsupported schema v${detectedVersion} is regenerated from ${contract.sourceOfTruth}`
  );
}

/** Look up a store kind and decide its compatibility. */
export function checkStoreCompatibility(input: {
  kind: string;
  detectedVersion?: number;
  normalized?: boolean;
}): StoreCompatibilityResult {
  let contract: StoreContractDeclaration;

  try {
    contract = storeContract(input.kind as StoreContractDeclaration['kind']);
  } catch {
    return {
      kind: input.kind,
      storeClass: 'unknown',
      status: 'blocked',
      reasonCode: 'STORE_UNKNOWN',
      schemaVersion: 0,
      ...(input.detectedVersion !== undefined ? { detectedVersion: input.detectedVersion } : {}),
      normalized: false,
      detail: 'no declared store contract',
    };
  }

  return decideStoreCompatibility(contract, {
    ...(input.detectedVersion !== undefined ? { detectedVersion: input.detectedVersion } : {}),
    normalized: input.normalized === true,
  });
}

export interface StoreCompatibilitySummary {
  status: StoreStatus;
  compatible: number;
  migrated: number;
  rebuildRequired: number;
  blocked: number;
  reasonCodes: StoreReasonCode[];
}

/** Aggregate per-store results into one deterministic verdict. */
export function summariseStoreCompatibility(
  results: readonly StoreCompatibilityResult[]
): StoreCompatibilitySummary {
  let compatible = 0;
  let migrated = 0;
  let rebuildRequired = 0;
  let blocked = 0;

  const reasonCodes = new Set<StoreReasonCode>();

  for (const result of results) {
    reasonCodes.add(result.reasonCode);

    if (result.status === 'compatible') compatible += 1;
    else if (result.status === 'migrated') migrated += 1;
    else if (result.status === 'rebuild_required') rebuildRequired += 1;
    else blocked += 1;
  }

  const status: StoreStatus =
    blocked > 0
      ? 'blocked'
      : rebuildRequired > 0
        ? 'rebuild_required'
        : migrated > 0
          ? 'migrated'
          : 'compatible';

  return {
    status,
    compatible,
    migrated,
    rebuildRequired,
    blocked,
    reasonCodes: [...reasonCodes].sort(),
  };
}

/** Class of a store kind, or `unknown` when it has no contract. */
export function storeClassOf(kind: string): StoreClassOrUnknown {
  try {
    return storeContract(kind as StoreContractDeclaration['kind']).storeClass;
  } catch {
    return 'unknown';
  }
}
