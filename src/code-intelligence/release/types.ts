/*
 * Phase 83 — Release Intelligence / Pre-Release Certification & Compatibility Gate.
 *
 * Turns the current repository state into a deterministic release-readiness
 * report: which capabilities exist in source, which exist in the packaged
 * runtime, whether the version/manifest truth is stale, whether the public
 * contract surface changed incompatibly, whether the npm package is safe, and
 * what semantic-version class is recommended.
 *
 * This layer is ANALYSIS ONLY. It never commits, pushes, tags, bumps a version
 * or publishes. It never returns safeToPublish/safeToMerge. A "ready" readiness
 * is scoped to the verified, declared surfaces — never a global guarantee.
 *
 * No LLM. No embeddings. No vector database.
 */

/** Certification identity of this release-intelligence layer. */
export const PHASE83_RELEASE_INTELLIGENCE = 'PHASE83_RELEASE_INTELLIGENCE';

export const RELEASE_INTELLIGENCE = 'RELEASE INTELLIGENCE';

/** Release readiness decision. `ready` is scoped, never global. */
export type ReleaseReadiness = 'ready' | 'review_required' | 'blocked';

/** Advisory semantic-version class. Never applied to package.json. */
export type SemverBump = 'patch' | 'minor' | 'major' | 'unknown';

/** Public surfaces Phase 83 can compare structurally. */
export type PublicSurfaceKind = 'mcp_tool' | 'cli_command' | 'daemon_protocol' | 'artifact_schema';

/** Where a capability is expected to exist. */
export type Presence = 'present' | 'absent';

/** Certification state of a capability. */
export type CertificationState = 'pass' | 'fail' | 'not_certified';

/** Machine-readable release reason codes. */
export type ReleaseReasonCode =
  | 'PHASE_CERTIFICATION_FAILED'
  | 'QUALITY_GATE_FAILED'
  | 'SOURCE_BUNDLE_MISMATCH'
  | 'PACKAGED_CAPABILITY_MISSING'
  | 'MCP_SCHEMA_BREAKING_CHANGE'
  | 'DAEMON_PROTOCOL_BREAKING_CHANGE'
  | 'ARTIFACT_SCHEMA_REBUILD_REQUIRED'
  | 'AUTHORITY_SCHEMA_MIGRATION_REQUIRED'
  | 'STORAGE_CLASSIFICATION_UNKNOWN'
  | 'DERIVED_STORAGE_CHANGED'
  | 'STORAGE_MIGRATION_CHANGED'
  | 'VERSION_TRUTH_STALE'
  | 'VERSION_SOURCE_DIVERGENCE'
  | 'RELEASE_MANIFEST_STALE'
  | 'BASE_RELEASE_UNKNOWN'
  | 'PACKAGE_SECRET_LEAK'
  | 'PACKAGE_CONTENT_UNEXPECTED'
  | 'BUNDLE_STALE'
  | 'CONTRACT_ANALYSIS_INCOMPLETE'
  | 'TEST_VERIFICATION_INCOMPLETE'
  | 'DIRTY_WORKTREE'
  | 'FINAL_RELEASE_REQUIRES_COMMITTED_TREE'
  | 'RELEASE_LIMIT_REACHED'
  | 'RELEASE_SURFACE_UNSUPPORTED'
  | 'RELEASE_PROBE_UNAVAILABLE';

export type ReleaseReasonSeverity = 'blocker' | 'warning';

export interface ReleaseReason {
  code: ReleaseReasonCode;
  severity: ReleaseReasonSeverity;
  detail?: string;
}

/** Per-capability source/packaged/certified status. */
export interface CapabilityStatus {
  id: string;
  /** Where the capability came from (mcp_tool, certification, runtime_method). */
  category: string;
  source: Presence;
  packaged: Presence;
  certified: CertificationState;
}

/** Deterministic source capability inventory. */
export interface CapabilityInventory {
  /** Sorted capability ids actually registered in source. */
  ids: string[];
  /** Capability id → category. */
  categories: Record<string, string>;
  /**
   * Support level of the inventory for the surfaces it covers. `partial` means
   * at least one known surface could not be fully enumerated.
   */
  coverage: 'complete' | 'partial' | 'unsupported';
  unsupported: string[];
}

/** Deterministic packaged capability inventory (from the built bundle). */
export interface PackagedInventory {
  ids: string[];
  bundlePath: string;
  bundlePresent: boolean;
  /** Normalized content fingerprint of the bundle. */
  bundleFingerprint: string;
  coverage: 'complete' | 'partial' | 'unsupported';
  unsupported: string[];
}

/** Source vs packaged parity result. */
export interface CapabilityParity {
  capabilities: CapabilityStatus[];
  missingInPackage: string[];
  extraInPackage: string[];
  /** Missing packaged capabilities that are required for release. */
  missingRequired: string[];
  complete: boolean;
}

/** One reported version source. */
export interface VersionSource {
  source: string;
  version: string;
  active: boolean;
}

export interface VersionTruth {
  sources: VersionSource[];
  /** Version sources that describe the active runtime but disagree. */
  divergences: string[];
  /** True when no source is authoritative for the current capability set. */
  stale: boolean;
  currentVersion: string;
  latestTag?: string;
}

export interface ManifestTruth {
  present: boolean;
  manifestVersion?: string;
  /** Highest phase the manifest declares as certified. */
  manifestPhase?: number;
  /** Highest phase implemented in source. */
  sourcePhase?: number;
  stale: boolean;
}

/** A recognised file that changed between baseline and candidate. */
export interface SurfaceChange {
  surface: PublicSurfaceKind;
  identity: string;
  change: 'added' | 'removed' | 'changed';
  breaking: boolean;
  reasonCodes: string[];
}

export interface SurfaceComparison {
  surface: PublicSurfaceKind;
  changes: SurfaceChange[];
  /** Structural removals that are incompatible. */
  breakingChanges: SurfaceChange[];
  /** Additive changes that are backward compatible. */
  compatibleChanges: SurfaceChange[];
  coverage: 'complete' | 'partial' | 'unsupported';
  notes: string[];
}

export interface CompatibilitySummary {
  comparisons: SurfaceComparison[];
  breaking: number;
  compatible: number;
  unknown: number;
  /** True only when every supported surface was compared and none is partial. */
  complete: boolean;
}

/** Bounded package-content audit. */
export interface PackageContentAudit {
  /** Files that would be shipped by `npm pack`. */
  fileCount: number;
  /** Total unpacked bytes reported by npm, when available. */
  unpackedBytes?: number;
  /** Normalized shipped paths reported more than once (never legitimate). */
  duplicatePaths: string[];
  /** Sensitive file paths detected in the pack (never their contents). */
  sensitivePaths: string[];
  /** Unexpected derived-state/cache/tests paths detected. */
  unexpectedPaths: string[];
  /** Required runtime entrypoints that are present. */
  requiredPresent: string[];
  /** Required runtime entrypoints that are missing. */
  requiredMissing: string[];
  complete: boolean;
}

/** Reproducibility result for the packaged runtime. */
export interface ReproducibilityResult {
  /** Normalized content fingerprints of two consecutive builds. */
  firstFingerprint?: string;
  secondFingerprint?: string;
  /**
   * True when two rebuilds produced identical normalized fingerprints, false
   * when they diverged, undefined when the rebuild probe was not run.
   */
  reproducible: boolean | undefined;
  normalized: boolean;
  note?: string;
}

/** Certification inventory entry. */
export interface CertificationEntry {
  phase: number;
  script: string;
  present: boolean;
  /** Recorded result of the certification run within this analysis. */
  result: 'pass' | 'fail' | 'not_run';
  required: boolean;
}

export interface CertificationInventory {
  entries: CertificationEntry[];
  requiredPhases: number[];
  failing: number[];
  missing: number[];
  complete: boolean;
}

/** Build fingerprint of the packaged runtime. */
export interface BuildFingerprint {
  bundlePresent: boolean;
  bundleFingerprint: string;
  bundleBytes: number;
  stale: boolean;
}

export interface ReleaseScope {
  projectRoot: string;
  headCommit: string;
  branch?: string;
  dirty: boolean;
  worktreeFingerprint: string;
  packageVersion: string;
  nodeVersion: string;
  platform: string;
  profile: string;
  baselineRef?: string;
  /** Newest local version tag, when present (context only, never authority). */
  latestTag?: string;
}

/** Candidate release manifest generated in memory (never written). */
export interface CandidateReleaseManifest {
  schemaVersion: number;
  name: string;
  currentVersion: string;
  recommendedVersionBump: SemverBump;
  sourceCommit: string;
  worktreeFingerprint: string;
  capabilityFingerprint: string;
  capabilities: CapabilityStatus[];
  certifications: CertificationInventory;
  packagedRuntime: BuildFingerprint;
  compatibility: CompatibilitySummary;
  blockers: ReleaseReason[];
  warnings: ReleaseReason[];
}

/** Structured release-note candidate derived from real capabilities. */
export interface ReleaseNotesCandidate {
  added: string[];
  changed: string[];
  fixed: string[];
  compatibility: string[];
  migration: string[];
  knownLimitations: string[];
}

/**
 * Changed storage-layer files, classified by their declared store contract.
 *
 * Phase 84B: a change is only a migration requirement when it touches the
 * contract of an authority store. Barrel and infrastructure files carry no
 * persisted schema, and a derived store is regenerated from its source of
 * truth, so neither can block a release by itself.
 */
export interface StorageChangeReport {
  /** Changed files backing an authority store: blocking. */
  authority: string[];
  /** Changed files backing a derived store: rebuildable, never blocking. */
  derived: string[];
  /** Changed migration scripts that move authority data: review required. */
  migration: string[];
  /** Changed files whose store contract could not be resolved: blocking. */
  unclassified: string[];
  /** Newly added (untracked) storage files: additive, never a migration. */
  additive: string[];
}

export interface ReleaseReadinessReport {
  operation: 'status' | 'analyze' | 'manifest' | 'notes';
  scope: ReleaseScope;
  fingerprint: string;

  capabilities: {
    source: CapabilityInventory;
    packaged: PackagedInventory;
    parity: CapabilityParity;
  };

  versionTruth: VersionTruth;
  manifestTruth: ManifestTruth;

  build: BuildFingerprint;
  reproducibility: ReproducibilityResult;

  package: PackageContentAudit;

  compatibility: CompatibilitySummary;

  /** Phase 84B: classification of changed storage source files. */
  storage: StorageChangeReport;

  certifications: CertificationInventory;

  readiness: ReleaseReadiness;
  blockers: ReleaseReason[];
  warnings: ReleaseReason[];

  recommendedVersionBump: SemverBump;
  candidateManifest?: CandidateReleaseManifest;
  releaseNotes?: ReleaseNotesCandidate;

  complete: boolean;
}

/** Dependency manifest delta (offline, from package manifest comparison). */
export interface DependencyDelta {
  added: string[];
  removed: string[];
  changed: string[];
  complete: boolean;
}

export interface ReleaseLimits {
  /** Maximum files read from the npm pack manifest. */
  maxPackageFiles: number;
  /** Maximum capabilities tracked in one inventory. */
  maxCapabilities: number;
  /** Maximum public-surface changes reported. */
  maxSurfaceChanges: number;
  /** Maximum phase certifications considered. */
  maxCertifications: number;
  /** Maximum bytes read from the packaged bundle. */
  maxBundleReadBytes: number;
  /** Maximum bytes read from any package manifest. */
  maxPackageJsonBytes: number;
  /** Maximum working-tree files fingerprinted. */
  maxWorktreeFiles: number;
}

export interface ReleaseReadinessRequest {
  operation?: 'status' | 'analyze' | 'manifest' | 'notes';
  evidenceProfile?: 'scout' | 'verify' | 'auditor';
  /** Baseline ref used for the release delta; defaults to the latest tag. */
  baselineRef?: string;
  /** Optional pre-recorded certification results keyed by script name. */
  certificationResults?: Record<string, 'pass' | 'fail' | 'not_run'>;
  limits?: Partial<ReleaseLimits>;
}

/**
 * Deterministic facts bundle about the project's release state, shared by the
 * runtime orchestrator and MCP layer so standalone/daemon stay in parity.
 */
export interface ReleaseFacts {
  projectRoot: string;
  profile: string;
  requiredPhases: number[];
  /** Highest phase certification script implemented in source. */
  sourcePhase: number;
  headCommit: string;
  branch?: string;
  dirty: boolean;
  worktree: {
    dirty: boolean;
    fingerprint: string;
    trackedChanges: number;
    untrackedFiles: number;
  };
  packageVersion: string;
  packageName: string;
  nodeVersion: string;
  platform: string;
  /** Newest local version tag (context only, never authority). */
  latestTag?: string;
  source: {
    inventory: CapabilityInventory;
    truncated: boolean;
  };
  packaged: {
    inventory: PackagedInventory;
    truncated: boolean;
  };
  versionTruth: VersionTruth;
  manifestTruth: ManifestTruth;
  build: BuildFingerprint;
}

/** Runtime-facing release input (MCP tool / daemon parity path). */
export interface ReleaseAnalysisInput {
  projectRoot: string;
  request: ReleaseReadinessRequest;
  /** Run the controlled rebuild probe for reproducibility. */
  rebuild?: boolean;
}
