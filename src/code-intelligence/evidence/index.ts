/*
 * Phase 78 — Evidence Profiles barrel.
 *
 * Scout / Verify / Auditor decide how much proof a claim requires. The layer is
 * derived-state only: it orchestrates the existing graph, coverage,
 * cross-service, Fleet and source-verification facilities and never becomes an
 * authority for Memory, Tasks or ADRs.
 */

export * from './types.js';

export {
  EVIDENCE_PROFILES,
  EVIDENCE_PROFILE_NAMES,
  isEvidenceProfile,
  isNegativeClaim,
  profileDefinition,
  resolveProfileLimits,
  type ClaimDisposition,
  type EvidenceProfileDefinition,
} from './profiles.js';

export {
  EVIDENCE_LIMITS,
  auditorLimits,
  clampLimits,
  scoutLimits,
  verifyLimits,
} from './limits.js';

export {
  BLOCKING_REASON_CODES,
  EVIDENCE_REASON_CODES,
  dedupeReasons,
  type EvidenceReasonCode,
} from './diagnostics.js';

export {
  operationRequirements,
  requirementFor,
  type OperationRequirement,
} from './requirements.js';

export { evidenceFingerprint, planEvidence } from './planner.js';

export { combineCoverage, type CoverageCombination, type CoverageEntry } from './coverage.js';

export { collectPages, type PageCollection, type PageCollectionOptions } from './pagination.js';

export {
  isFallbackCandidate,
  runSourceFallback,
  type SourceFallbackInput,
  type SourceFallbackOutcome,
} from './source-fallback.js';

export { evaluateClaim, type ClaimEvaluation, type ClaimEvaluationInput } from './claims.js';

export { buildEvidenceBundle, type BuildBundleInput } from './report.js';

export {
  buildEvidenceFacts,
  createSourceReader,
  type EvidenceCoverageProvider,
  type EvidenceFactsInput,
} from './facts.js';

export {
  buildProjectEvidenceFacts,
  createCoverageProvider,
  crossServiceFactsFromSnapshot,
  fleetFactsFromSnapshot,
  gapsFromCoverageSnapshot,
  gapsFromCrossServiceSnapshot,
  type ProjectEvidenceFactsInput,
} from './project-facts.js';

export { executeEvidence, executeEvidenceSync, type ExecuteEvidenceOptions } from './executor.js';
