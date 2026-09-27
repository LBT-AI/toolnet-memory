/*
 * Phase 83 — release analysis report orchestrator.
 *
 * Produces the ReleaseReadinessReport by combining the facts bundle with
 * parity, compatibility, package audit, reproducibility and guard evidence.
 * Read-only by construction: the orchestrator never commits, tags, bumps or
 * publishes. Beyond the optional controlled rebuild used for reproducibility,
 * no build is triggered; bundle staleness is detected via source-vs-bundle
 * capability comparison.
 */

import { join } from 'node:path';

import { compareCapabilities } from './capabilities.js';
import { checkReproducibility, buildCertificationInventory } from './certifications.js';
import { contentFingerprint, releaseFingerprint } from './fingerprint.js';
import { auditPackageContents } from './package-audit.js';
import { readFileSync } from 'node:fs';
import { recommendVersionBump, evaluateReleaseGuard, surfaceChangeList } from './semver.js';
import { compareSurfaces, extractSurface, summariseCompatibility } from './surfaces.js';
import { gitReadOnly, isSafeRevision } from './git.js';
import { resolveReleaseLimits } from './limits.js';

import {
  classifyStorageSourcePath,
  isContractFreeRole,
} from '../../storage/compatibility/index.js';

import type {
  CapabilityParity,
  CompatibilitySummary,
  CandidateReleaseManifest,
  ReleaseNotesCandidate,
  ReleaseReadinessReport,
  ReleaseReadinessRequest,
  ReleaseReason,
  StorageChangeReport,
} from './types.js';

import type { ReleaseFacts } from './types.js';

export interface ReleaseReportInput {
  facts: ReleaseFacts;
  request: ReleaseReadinessRequest;
  /** When false, skip the reproducibility rebuild (faster, still audited). */
  rebuild?: boolean;
}

/** Read a source file at a given revision via read-only `git show`. */
function readAtRevision(projectRoot: string, revision: string, path: string): string | undefined {
  if (!isSafeRevision(revision) || !isSafeRevision(path) || path.startsWith('/')) {
    return undefined;
  }

  const result = gitReadOnly(projectRoot, [
    'show',
    '--no-ext-diff',
    '--no-textconv',
    '--end-of-options',
    `${revision}:${path}`,
    '--',
  ]);

  return result.ok ? result.stdout : undefined;
}

function isBundleStale(facts: ReleaseFacts, parity: CapabilityParity): boolean {
  if (!facts.build.bundlePresent) return true;

  /* A source tool missing from the bundle means the packaged runtime was not
   * regenerated after the source changed. */
  if (parity.missingRequired.length > 0) return true;

  return false;
}

export function runReleaseAnalysis(input: ReleaseReportInput): ReleaseReadinessReport {
  const facts = input.facts;
  const limits = resolveReleaseLimits(input.request.limits);

  const operation = input.request.operation ?? 'status';
  const profile = input.request.evidenceProfile ?? 'auditor';

  /* --- parity ----------------------------------------------------------- */
  const parity = compareCapabilities(facts.source.inventory, facts.packaged.inventory);
  const bundleStale = isBundleStale(facts, parity);

  const sourceCapabilityIds = facts.source.inventory.ids;
  const packagedCapabilityIds = facts.packaged.inventory.ids;

  /* --- baseline + surface compatibility --------------------------------- */
  const baselineRef =
    input.request.baselineRef !== undefined && isSafeRevision(input.request.baselineRef)
      ? input.request.baselineRef
      : undefined;

  let baselineKnown = false;

  let comparisons: CompatibilitySummary['comparisons'] = [];
  let surfaceCoverage: 'complete' | 'partial' | 'unsupported' = 'complete';
  const surfaceNotes: string[] = [];

  const effectiveBaseline = baselineRef ?? facts.latestTag;

  if (effectiveBaseline !== undefined && isSafeRevision(effectiveBaseline)) {
    const baselineSurface = extractSurface(facts.projectRoot, (path) =>
      readAtRevision(facts.projectRoot, effectiveBaseline, path)
    );

    const candidateSurface = extractSurface(facts.projectRoot, (path) => {
      const contained = path.replace(/^\/+ /u, '').trim();

      try {
        return readFileSync(join(facts.projectRoot, contained), 'utf8');
      } catch {
        return undefined;
      }
    });
    const compared = compareSurfaces({
      baseline: baselineSurface,
      candidate: candidateSurface,
      maxChanges: limits.maxSurfaceChanges,
    });

    comparisons = compared.comparisons;
    surfaceCoverage = compared.coverage;
    surfaceNotes.push(...compared.notes);
    baselineKnown = true;
  }

  const compatibility: CompatibilitySummary = {
    comparisons,
    ...summariseCompatibility(comparisons, surfaceCoverage),
  };

  /* --- package audit ----------------------------------------------------- */
  const packageAudit = auditPackageContents({
    projectRoot: facts.projectRoot,
    maxPackageFiles: limits.maxPackageFiles,
    maxPackageJsonBytes: limits.maxPackageJsonBytes,
  });

  /* --- reproducibility ---------------------------------------------------- */
  const reproducibility = input.rebuild
    ? checkReproducibility({
        projectRoot: facts.projectRoot,
        bundlePath: join(facts.projectRoot, 'bundle', 'mcp.js'),
      }).result
    : ({ reproducible: undefined, normalized: true, note: 'rebuild skipped' } as const);

  /* --- certifications ------------------------------------------------------ */
  const certifications = buildCertificationInventory({
    projectRoot: facts.projectRoot,
    requiredPhases: facts.requiredPhases,
    certificationResults: input.request.certificationResults,
    maxCertifications: limits.maxCertifications,
  });

  /* --- storage change classification (Phase 84B) ---------------------------- */
  const storageChanges: StorageChangeReport = {
    authority: [],
    derived: [],
    migration: [],
    unclassified: [],
    additive: [],
  };

  /* A touched file under src/storage is classified by the store contract it
   * implements — never by the directory it happens to live in. Only an
   * authority contract (or an unresolvable one) is a migration requirement:
   * barrel and infrastructure files carry no persisted schema, derived stores
   * are regenerated from their source of truth, and untracked files are
   * additive extensions. */
  const storageStatus = gitReadOnly(facts.projectRoot, [
    'status',
    '--porcelain=v1',
    '-z',
    /* `-uall` lists untracked files individually instead of collapsing a new
     * directory to one entry, so every added store file is reported. */
    '-uall',
    '--',
    'src/storage',
  ]);

  for (const entry of storageStatus.stdout.split('\u0000').filter(Boolean)) {
    const code = entry.slice(0, 2);
    const path = entry.slice(3);

    if (code === '??') {
      storageChanges.additive.push(path);
      continue;
    }

    /* X=Y: X is the index status, Y the work-tree status. */
    if (!code.includes('M') && !code.includes('T')) {
      continue;
    }

    const classification = classifyStorageSourcePath(path);

    if (isContractFreeRole(classification.role)) {
      continue;
    }

    if (classification.role === 'migration') {
      storageChanges.migration.push(path);
      surfaceNotes.push(`STORAGE_MIGRATION_TOUCHED:${path}`);
      continue;
    }

    if (classification.storeClass === 'derived' || classification.storeClass === 'ephemeral') {
      storageChanges.derived.push(path);
      surfaceNotes.push(`DERIVED_STORAGE_TOUCHED:${path}`);
      continue;
    }

    if (classification.storeClass === 'authority') {
      storageChanges.authority.push(path);
      surfaceNotes.push(`AUTHORITY_STORAGE_TOUCHED:${path}`);
      continue;
    }

    storageChanges.unclassified.push(path);
    surfaceNotes.push(`STORAGE_CLASSIFICATION_UNKNOWN:${path}`);
  }

  storageChanges.authority.sort();
  storageChanges.derived.sort();
  storageChanges.migration.sort();
  storageChanges.unclassified.sort();
  storageChanges.additive.sort();

  const authorityMigrationRequired =
    storageChanges.authority.length > 0 || storageChanges.unclassified.length > 0;

  /* --- artifact schema delta ---------------------------------------------- */
  let artifactRebuildRequired = false;

  if (baselineKnown && effectiveBaseline !== undefined) {
    const baselineArtifact = readAtRevision(
      facts.projectRoot,
      effectiveBaseline,
      'src/code-intelligence/artifact/types.ts'
    );

    let candidateArtifact: string | undefined;

    try {
      candidateArtifact = readFileSync(
        join(facts.projectRoot, 'src/code-intelligence/artifact/types.ts'),
        'utf8'
      );
    } catch {
      candidateArtifact = undefined;
    }

    const baselineVersion = /ARTIFACT_SCHEMA_VERSION\s*=\s*(\d+)/u.exec(
      baselineArtifact ?? ''
    )?.[1];
    const candidateVersion = /ARTIFACT_SCHEMA_VERSION\s*=\s*(\d+)/u.exec(
      candidateArtifact ?? ''
    )?.[1];

    /* A baseline that never had the artifact module is a pure addition — the
     * candidate version exists with nothing to migrate, so no rebuild flag. */
    artifactRebuildRequired =
      baselineVersion !== undefined &&
      candidateVersion !== undefined &&
      baselineVersion !== candidateVersion;
  }

  /* --- semver -------------------------------------------------------------- */
  const recommendedVersionBump = recommendVersionBump({
    compatibility,
    baselineKnown,
  });

  /* --- guard ---------------------------------------------------------------- */
  const guard = evaluateReleaseGuard({
    certificationsComplete: certifications.inventory.complete,
    failingCertifications: certifications.inventory.failing,
    missingCertifications: certifications.inventory.missing,
    parityComplete: parity.complete,
    missingRequiredCapabilities: parity.missingRequired,
    bundleStale,
    compatibility,
    contractAnalysisIncomplete: surfaceCoverage !== 'complete',
    packageAuditComplete: packageAudit.audit.complete && packageAudit.available,
    packageSensitivePaths: packageAudit.audit.sensitivePaths,
    packageUnexpectedPaths: packageAudit.audit.unexpectedPaths,
    packageRequiredMissing: packageAudit.audit.requiredMissing,
    reproducible: reproducibility.reproducible,
    versionStale: facts.versionTruth.stale,
    versionDivergences: facts.versionTruth.divergences,
    manifestStale: facts.manifestTruth.stale,
    baselineKnown,
    dirtyWorktree: facts.dirty,
    authorityMigrationRequired,
    artifactRebuildRequired,
    storageChanges,
    testVerificationIncomplete: false,
  });

  /* --- fingerprint ------------------------------------------------------------ */
  const fingerprint = releaseFingerprint({
    currentVersion: facts.packageVersion,
    headCommit: facts.headCommit,
    worktreeFingerprint: facts.worktree.fingerprint,
    sourceCapabilityFingerprint: contentFingerprint(JSON.stringify(sourceCapabilityIds)),
    packagedCapabilityFingerprint: contentFingerprint(JSON.stringify(packagedCapabilityIds)),
    profile,
  });

  const blockers: ReleaseReason[] = guard.blockers;
  const warnings: ReleaseReason[] = guard.warnings;

  if (facts.source.truncated || facts.packaged.truncated) {
    warnings.push({
      code: 'RELEASE_LIMIT_REACHED',
      severity: 'warning',
      detail: 'capability inventory truncated',
    });
  }

  if (packageAudit.truncated) {
    warnings.push({
      code: 'RELEASE_LIMIT_REACHED',
      severity: 'warning',
      detail: 'package manifest truncated',
    });
  }

  /* --- report ------------------------------------------------------------------ */
  const report: ReleaseReadinessReport = {
    operation,
    scope: {
      projectRoot: facts.projectRoot,
      headCommit: facts.headCommit,
      ...(facts.branch ? { branch: facts.branch } : {}),
      dirty: facts.dirty,
      worktreeFingerprint: facts.worktree.fingerprint,
      packageVersion: facts.packageVersion,
      nodeVersion: facts.nodeVersion,
      platform: facts.platform,
      profile,
      ...(effectiveBaseline !== undefined ? { baselineRef: effectiveBaseline } : {}),
    },
    fingerprint,

    capabilities: {
      source: facts.source.inventory,
      packaged: facts.packaged.inventory,
      parity,
    },

    versionTruth: facts.versionTruth,
    manifestTruth: facts.manifestTruth,

    build: facts.build,
    reproducibility,

    package: packageAudit.audit,

    compatibility,

    storage: storageChanges,

    certifications: certifications.inventory,

    readiness: guard.readiness,
    blockers,
    warnings,

    recommendedVersionBump,

    complete:
      guard.complete &&
      !facts.source.truncated &&
      !facts.packaged.truncated &&
      !packageAudit.truncated,
  };

  if (operation === 'manifest' || operation === 'analyze') {
    report.candidateManifest = buildCandidateManifest(report, facts);
  }

  if (operation === 'notes' || operation === 'analyze') {
    report.releaseNotes = buildReleaseNotes(report, facts);
  }

  return report;
}

/** Build the in-memory candidate release manifest (never written to disk). */
function buildCandidateManifest(
  report: ReleaseReadinessReport,
  facts: ReleaseFacts
): CandidateReleaseManifest {
  return {
    schemaVersion: 1,
    name: facts.packageName,
    currentVersion: facts.packageVersion,
    recommendedVersionBump: report.recommendedVersionBump,
    sourceCommit: facts.headCommit,
    worktreeFingerprint: facts.worktree.fingerprint,
    capabilityFingerprint: report.fingerprint,
    capabilities: report.capabilities.parity.capabilities,
    certifications: report.certifications,
    packagedRuntime: report.build,
    compatibility: report.compatibility,
    blockers: report.blockers,
    warnings: report.warnings,
  };
}

/** Build structured release notes from the real capability delta. */
function buildReleaseNotes(
  report: ReleaseReadinessReport,
  facts: ReleaseFacts
): ReleaseNotesCandidate {
  const changes = surfaceChangeList(report.compatibility.comparisons);

  const added = changes
    .filter((change) => change.change === 'added' && !change.breaking)
    .map((change) => `${change.surface}: ${change.identity}`);

  const removedOrChanged = changes.filter((change) => change.change !== 'added');

  const phaseEntries = report.certifications.entries.filter((entry) => entry.present);

  const knownLimitations = [
    'Release readiness is scoped to verified declared surfaces; it is never a global safety guarantee.',
    'Reproducibility compares normalized bundle fingerprints; byte-identical archives are not asserted.',
  ];

  return {
    added,
    changed: removedOrChanged.map(
      (change) => `${change.surface}: ${change.identity} (${change.change})`
    ),
    fixed: [],
    compatibility: [
      `breaking=${report.compatibility.breaking}`,
      `compatible-additions=${report.compatibility.compatible}`,
      `recommendedBump=${report.recommendedVersionBump}`,
    ],
    migration: [
      ...(artifactRebuildRequiredFor(report)
        ? ['graph artifact rebuild required (derived cache)']
        : []),
      ...(authorityMigrationRequiredFor(report)
        ? ['authority storage schema migration required before release']
        : []),
    ],
    knownLimitations,
    ...{},
  };

  function artifactRebuildRequiredFor(candidate: ReleaseReadinessReport): boolean {
    return candidate.warnings.some((reason) => reason.code === 'ARTIFACT_SCHEMA_REBUILD_REQUIRED');
  }

  function authorityMigrationRequiredFor(candidate: ReleaseReadinessReport): boolean {
    return candidate.blockers.some(
      (reason) => reason.code === 'AUTHORITY_SCHEMA_MIGRATION_REQUIRED'
    );
  }

  void facts;
  void phaseEntries;
}
