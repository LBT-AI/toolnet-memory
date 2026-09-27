/*
 * Phase 83 — deterministic semver recommendation and release guard.
 *
 * The recommendation is derived ONLY from structural public-surface evidence:
 * a verified incompatible public contract change is major; purely additive
 * public capability is minor; no public-surface change at all is patch. With
 * incomplete compatibility evidence the class is unknown. The recommendation
 * is advisory: package.json is never modified.
 */

import type {
  CompatibilitySummary,
  ReleaseReason,
  SemverBump,
  StorageChangeReport,
  SurfaceChange,
  SurfaceComparison,
} from './types.js';

export interface SemverInput {
  compatibility: CompatibilitySummary;
  baselineKnown: boolean;
}

export function recommendVersionBump(input: SemverInput): SemverBump {
  if (!input.baselineKnown || !input.compatibility.complete) {
    return 'unknown';
  }

  if (input.compatibility.breaking > 0) {
    return 'major';
  }

  const additions = input.compatibility.comparisons.some(
    (comparison) => comparison.compatibleChanges.length > 0
  );

  if (additions) {
    return 'minor';
  }

  return 'patch';
}

/* --- guard ------------------------------------------------------------- */

export interface GuardInput {
  certificationsComplete: boolean;
  failingCertifications: readonly number[];
  missingCertifications: readonly number[];

  parityComplete: boolean;
  missingRequiredCapabilities: readonly string[];

  bundleStale: boolean;

  compatibility: CompatibilitySummary;
  contractAnalysisIncomplete: boolean;

  packageAuditComplete: boolean;
  packageSensitivePaths: readonly string[];
  packageUnexpectedPaths: readonly string[];
  packageRequiredMissing: readonly string[];

  reproducible: boolean | undefined;

  versionStale: boolean;
  versionDivergences: readonly string[];

  manifestStale: boolean;

  baselineKnown: boolean;

  dirtyWorktree: boolean;

  authorityMigrationRequired: boolean;
  artifactRebuildRequired: boolean;

  /**
   * Phase 84B: changed storage files classified by their store contract.
   * Optional so historical callers keep compiling; absent means "no storage
   * change evidence", never "assume authority changed".
   */
  storageChanges?: StorageChangeReport;

  testVerificationIncomplete: boolean;
}

export interface GuardResult {
  readiness: 'ready' | 'review_required' | 'blocked';
  blockers: ReleaseReason[];
  warnings: ReleaseReason[];
  complete: boolean;
}

/** Combine the release evidence into a structured readiness decision. */
export function evaluateReleaseGuard(input: GuardInput): GuardResult {
  const blockers: ReleaseReason[] = [];
  const warnings: ReleaseReason[] = [];

  const blocker = (code: ReleaseReason['code'], detail?: string): void => {
    blockers.push({ code, severity: 'blocker', ...(detail ? { detail } : {}) });
  };

  const warning = (code: ReleaseReason['code'], detail?: string): void => {
    warnings.push({ code, severity: 'warning', ...(detail ? { detail } : {}) });
  };

  /* Certifications. */
  if (!input.certificationsComplete) {
    blocker(
      'PHASE_CERTIFICATION_FAILED',
      `failing=${input.failingCertifications.join(',') || 'none'} missing=${input.missingCertifications.join(',') || 'none'}`
    );
  }

  /* Capability parity. */
  if (!input.parityComplete) {
    blocker(
      'PACKAGED_CAPABILITY_MISSING',
      input.missingRequiredCapabilities.join(',') || 'source capability absent from package'
    );
  }

  /* Bundle freshness. */
  if (input.bundleStale) {
    blocker('BUNDLE_STALE', 'packaged runtime does not match current source');
  }

  /* Compatibility. */
  if (input.compatibility.breaking > 0) {
    blocker(
      'MCP_SCHEMA_BREAKING_CHANGE',
      `${input.compatibility.breaking} incompatible public-surface change(s)`
    );
  }

  if (input.contractAnalysisIncomplete) {
    warning('CONTRACT_ANALYSIS_INCOMPLETE');
  }

  if (input.testVerificationIncomplete) {
    warning('TEST_VERIFICATION_INCOMPLETE');
  }

  /* Package contents. */
  if (input.packageSensitivePaths.length > 0) {
    blocker('PACKAGE_SECRET_LEAK', input.packageSensitivePaths.join(', '));
  }

  if (input.packageUnexpectedPaths.length > 0) {
    blocker('PACKAGE_CONTENT_UNEXPECTED', input.packageUnexpectedPaths.join(', '));
  }

  if (input.packageRequiredMissing.length > 0) {
    blocker(
      'PACKAGED_CAPABILITY_MISSING',
      `missing package files: ${input.packageRequiredMissing.join(', ')}`
    );
  }

  if (!input.packageAuditComplete && input.packageSensitivePaths.length === 0) {
    warning('PACKAGE_CONTENT_UNEXPECTED', 'package audit incomplete');
  }

  /* Reproducibility. */
  if (input.reproducible === false) {
    warning('RELEASE_PROBE_UNAVAILABLE', 'rebuild fingerprint divergence detected');
  }

  /* Version / manifest truth. */
  if (input.versionDivergences.length > 0) {
    warning('VERSION_SOURCE_DIVERGENCE', input.versionDivergences.join(', '));
  }

  if (input.versionStale) {
    warning('VERSION_TRUTH_STALE');
  }

  if (input.manifestStale) {
    warning('RELEASE_MANIFEST_STALE');
  }

  if (!input.baselineKnown) {
    warning('BASE_RELEASE_UNKNOWN');
  }

  /* Worktree state. */
  if (input.dirtyWorktree) {
    warning('DIRTY_WORKTREE');
    warning('FINAL_RELEASE_REQUIRES_COMMITTED_TREE');
  }

  /* Storage.
   *
   * Phase 84B: only a change to an AUTHORITY store contract (or a file whose
   * contract cannot be resolved) is a migration requirement. A barrel or
   * infrastructure file carries no persisted schema, and a derived store is
   * regenerated from its source of truth — reporting either as an authority
   * migration was a false positive. */
  const storage = input.storageChanges;

  const authorityChangedByStorage =
    (storage?.authority.length ?? 0) > 0 || (storage?.unclassified.length ?? 0) > 0;

  if (input.authorityMigrationRequired || authorityChangedByStorage) {
    blocker(
      'AUTHORITY_SCHEMA_MIGRATION_REQUIRED',
      storage?.authority.length ? storage.authority.join(', ') : undefined
    );
  }

  if ((storage?.unclassified.length ?? 0) > 0) {
    blocker('STORAGE_CLASSIFICATION_UNKNOWN', storage?.unclassified.join(', '));
  }

  if ((storage?.derived.length ?? 0) > 0) {
    warning('DERIVED_STORAGE_CHANGED', storage?.derived.join(', '));
  }

  if ((storage?.migration.length ?? 0) > 0) {
    warning('STORAGE_MIGRATION_CHANGED', storage?.migration.join(', '));
  }

  if (input.artifactRebuildRequired) {
    warning('ARTIFACT_SCHEMA_REBUILD_REQUIRED');
  }

  /* Unavailable evidence makes the whole report incomplete. */
  const complete =
    input.certificationsComplete &&
    input.parityComplete &&
    input.compatibility.complete &&
    input.packageAuditComplete;

  const status: GuardResult['readiness'] = blockers.length
    ? 'blocked'
    : complete && warnings.length === 0
      ? 'ready'
      : 'review_required';

  return { readiness: status, blockers, warnings, complete };
}

/** Flatten comparisons for manifest/notes generation. */
export function surfaceChangeList(comparisons: readonly SurfaceComparison[]): SurfaceChange[] {
  return comparisons
    .flatMap((comparison) => comparison.changes)
    .sort(
      (left, right) =>
        left.surface.localeCompare(right.surface) || left.identity.localeCompare(right.identity)
    );
}
