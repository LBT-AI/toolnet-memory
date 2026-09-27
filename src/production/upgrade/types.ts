/*
 * Phase 84C — upgrade orchestration: the vocabulary.
 *
 * Phase 84B answered "what kind of store is this, and what may a build do with
 * it". This phase answers the next question: given the stores that actually
 * exist on disk and the runtime that is about to replace the current one, what
 * is the ordered, safe set of things an upgrade must do?
 *
 * This file is data only: no file system, no process, no clock, no I/O.
 */

import type { StoreClassOrUnknown, StoreReasonCode } from '../../storage/compatibility/index.js';

/** What an upgrade may do with one observed store. */
export type StoreUpgradeAction =
  'compatible' | 'migrate' | 'rebuild' | 'block' | 'ignore_ephemeral';

/**
 * Why an upgrade cannot start at all.
 *
 * Codes, not sentences: the per-store detail stays on the store entry that
 * produced the code, so a caller renders both without parsing text.
 */
export type UpgradeBlockerCode =
  'UPGRADE_AUTHORITY_MIGRATION_MISSING' | 'UPGRADE_AUTHORITY_UNSUPPORTED' | 'UPGRADE_STORE_UNKNOWN';

/** Why an upgrade started and then stopped. */
export type UpgradeFailureCode =
  | 'UPGRADE_MIGRATION_FAILED'
  | 'UPGRADE_REBUILD_FAILED'
  | 'UPGRADE_EPHEMERAL_CLEAR_FAILED'
  | 'UPGRADE_VERIFY_FAILED'
  | 'UPGRADE_DAEMON_RESTART_FAILED'
  | 'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS'
  | 'UPGRADE_PARTIAL_FAILURE';

/** Non-fatal condition worth reporting. */
export type UpgradeWarningCode =
  | 'UPGRADE_BUILD_FINGERPRINT_CHANGED'
  | 'UPGRADE_DAEMON_RESTART_REQUIRED'
  | 'UPGRADE_DERIVED_REBUILD_OPTIONAL'
  | 'UPGRADE_AUTHORITY_MIGRATION_REQUIRED';

/**
 * The fixed upgrade phases, in execution order.
 *
 * The order is a safety property, not a preference: authority is inspected
 * before anything is touched, backed up before it is migrated, verified before
 * derived data is regenerated, and the daemon is only restarted once the data
 * on disk is known to be valid.
 */
export type UpgradePhase =
  | 'inspect'
  | 'block_unsupported'
  | 'backup_authority'
  | 'migrate_authority'
  | 'verify_authority'
  | 'rebuild_derived'
  | 'clear_ephemeral'
  | 'restart_daemon'
  | 'verify_upgrade';

/** One store as it was actually observed on disk. */
export interface StoreObservation {
  kind: string;
  detectedVersion?: number;
  normalized?: boolean;
}

/** The planned treatment of one store. */
export interface StoreUpgradeActionEntry {
  kind: string;
  storeClass: StoreClassOrUnknown;
  action: StoreUpgradeAction;
  reasonCode: StoreReasonCode;
  /** True when this store must be backed up before its action runs. */
  requiresBackup: boolean;
  /** Migration to run when `action === 'migrate'`. */
  migrationId?: string;
  /** True when a rebuild is safe to skip (representable but not required). */
  rebuildOptional?: boolean;
  detail?: string;
}

/**
 * The complete, deterministic upgrade decision.
 *
 * `complete` is true exactly when the plan covers every observed store and
 * nothing blocks it; a blocked plan is still returned in full so an operator
 * can see what *would* have happened.
 */
export interface UpgradePlan {
  stores: StoreUpgradeActionEntry[];
  daemonRestartRequired: boolean;
  /** Store kinds to regenerate, deterministically ordered. */
  rebuilds: string[];
  /** Migration ids to run, deterministically ordered. */
  migrations: string[];
  /** Store kinds to discard, deterministically ordered. */
  ephemeral: string[];
  blockers: UpgradeBlockerCode[];
  warnings: UpgradeWarningCode[];
  complete: boolean;
}

/** Recovery state when the daemon restart phase cannot finish. */
export interface DaemonRestartFailure {
  code: 'UPGRADE_DAEMON_RESTART_FAILED' | 'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS';
  message: string;
  runtimeRoot: string;
  socketPath: string;
  oldDaemonStopped: boolean;
  newDaemonStarted: boolean;
  retryable: boolean;
}

/** A stopped upgrade, with enough context to act on it. */
export interface UpgradeFailure {
  code: UpgradeFailureCode;
  /** `code` plus `UPGRADE_PARTIAL_FAILURE` when mutating work already ran. */
  codes: UpgradeFailureCode[];
  phase: UpgradePhase;
  message: string;
  /** True when some phases already succeeded and the tree is half-upgraded. */
  partial: boolean;
  /** Present when the daemon restart phase failed, including its recovery state. */
  restartFailure?: DaemonRestartFailure;
}

/** What happened in one phase. */
export interface UpgradeStepRecord {
  phase: UpgradePhase;
  status: 'ok' | 'skipped' | 'failed';
  detail?: string;
}

/** The result of planning (dry-run) or applying an upgrade. */
export interface UpgradeResult {
  outcome: 'planned' | 'applied' | 'blocked' | 'failed';
  plan: UpgradePlan;
  steps: UpgradeStepRecord[];
  daemonRestarted: boolean;
  backupId?: string;
  failure?: UpgradeFailure;
}

/**
 * The imperatives an upgrade needs.
 *
 * Injected rather than imported so the ordering rules are testable without a
 * file system, a registry, or a daemon — and so nothing can accidentally run
 * during a dry run.
 */
export interface UpgradePorts {
  /** Durably capture authority state before any migration writes. */
  backupAuthority(reason: string): Promise<{ backupId: string }>;
  runMigration(migrationId: string): Promise<void>;
  /** Re-read the migrated authority state and confirm it is valid. */
  verifyMigration(migrationId: string): Promise<boolean>;
  rebuildDerived(kinds: readonly string[]): Promise<void>;
  clearEphemeral(kinds: readonly string[]): Promise<void>;
  restartDaemon(): Promise<void>;
  verifyUpgrade(): Promise<void>;
}

export interface RunUpgradeOptions {
  /**
   * Report the plan without touching anything.
   *
   * Defaults to true: an upgrade runs only when a caller explicitly opts in.
   */
  dryRun?: boolean;
}
