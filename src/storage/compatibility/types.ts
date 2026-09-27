/*
 * Phase 84B — storage compatibility model: types.
 *
 * One central vocabulary for what a persisted store IS and how a build may
 * treat it across versions. Classification is declared here once and consumed
 * by the store readers, the compatibility check and the release analysis —
 * never re-derived from paths at each call site.
 */

/** Who owns the truth a store holds. */
export type StoreClass = 'authority' | 'derived' | 'ephemeral';

/** `unknown` is a deliberate third state: never guess, block instead. */
export type StoreClassOrUnknown = StoreClass | 'unknown';

/**
 * Declared cross-version relationship for a store contract.
 *
 * - `exact`               — only the current schema version is accepted.
 * - `backward_compatible` — older supported versions are read and normalized.
 * - `rebuild_required`    — data is regenerated from its source of truth.
 * - `migration_required`  — an explicit migration must move stored data.
 * - `unsupported`         — the build cannot interpret the stored data.
 */
export type StoreCompatibility =
  'exact' | 'backward_compatible' | 'rebuild_required' | 'migration_required' | 'unsupported';

/** Outcome of checking one store payload against its contract. */
export type StoreStatus = 'compatible' | 'migrated' | 'rebuild_required' | 'blocked';

/** Machine-readable reason attached to every compatibility result. */
export type StoreReasonCode =
  | 'STORE_SCHEMA_CURRENT'
  | 'STORE_SCHEMA_LEGACY_COMPATIBLE'
  | 'STORE_MIGRATION_REQUIRED'
  | 'DERIVED_STORE_REBUILD_REQUIRED'
  | 'AUTHORITY_MIGRATION_REQUIRED'
  | 'STORE_SCHEMA_UNSUPPORTED'
  | 'STORE_UNKNOWN';

/** Every persisted store this build knows about. */
export type StoreKind =
  /* authority */
  | 'memory_records'
  | 'task_operations'
  | 'task_replication_log'
  | 'retrieval_feedback'
  | 'retrieval_telemetry'
  | 'retrieval_overrides'
  | 'session_wal'
  | 'adr_state'
  | 'project_manifest'
  | 'recovery_backup'
  /* derived */
  | 'task_projection'
  | 'code_graph'
  | 'code_manifest'
  | 'resolution_snapshot'
  | 'graph_coverage'
  | 'cross_service'
  | 'fleet_export'
  | 'snapshot_archive'
  | 'code_artifacts'
  | 'code_chunks'
  | 'code_vectors'
  | 'memory_vectors'
  | 'architecture_snapshot'
  | 'code_analysis'
  | 'visualization_graph'
  | 'runtime_traces'
  | 'journal'
  /* ephemeral */
  | 'task_replication_cursor'
  | 'runtime_locks'
  | 'daemon_state'
  | 'daemon_runtime_files'
  | 'artifact_staging'
  | 'test_run_cache';

/**
 * Legacy value domains that a reader rewrites in memory.
 *
 * A persisted store can keep the same numeric `version` while changing the
 * vocabulary of one of its fields; the numeric version alone cannot detect it,
 * so the domain is declared explicitly and normalized by the owning module.
 */
export type LegacyValueDomain = 'resolution_kind_uppercase';

/** The declared contract for one store. */
export interface StoreContract {
  kind: StoreKind;
  storeClass: StoreClass;
  /** Schema version this build writes and considers current. */
  schemaVersion: number;
  /** Older on-disk versions this build still reads. */
  supportedLegacyVersions: readonly number[];
  /** Cross-version relationship of this store. */
  compatibility: StoreCompatibility;
  /** Behaviour when a payload carries no version marker at all. */
  missingVersionPolicy: 'accept' | 'assume_legacy' | 'reject';
  /** Where authoritative truth for this store lives (derived/ephemeral only). */
  sourceOfTruth: string;
  /** Legacy value domains the owning reader normalizes, if any. */
  legacyValueDomains: readonly LegacyValueDomain[];
  description: string;
}

/** Result of checking one store payload against its contract. */
export interface StoreCompatibilityResult {
  /** Declared kind, or the raw string when no contract exists for it. */
  kind: StoreKind | string;
  storeClass: StoreClassOrUnknown;
  status: StoreStatus;
  reasonCode: StoreReasonCode;
  /** Current schema version declared by the contract. */
  schemaVersion: number;
  /** Version observed in the payload, when the store carries one. */
  detectedVersion?: number;
  /** True when a reader-side normalizer rewrote legacy values in memory. */
  normalized: boolean;
  detail?: string;
}

/** Resolution of a persisted storage key to a store kind. */
export interface StorageKeyClassification {
  /** Canonical storage key or prefix that was classified. */
  key: string;
  kind: StoreKind | null;
  storeClass: StoreClassOrUnknown;
  matched: boolean;
}

/** Role a repository source file plays for the storage layer. */
export type StorageSourceRole =
  'barrel' | 'infrastructure' | 'migration' | 'store' | 'unclassified';

/** Resolution of a repository source path under `src/storage`. */
export interface StorageSourceClassification {
  path: string;
  role: StorageSourceRole;
  kind: StoreKind | null;
  storeClass: StoreClassOrUnknown;
}
