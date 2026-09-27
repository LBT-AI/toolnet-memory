/*
 * Phase 80 — Change Intelligence.
 *
 * Turns a deterministic code change (git working tree, staged, commit, commit
 * range or an explicit patch) into impact evidence and a regression-guard
 * decision.
 *
 * This layer is ANALYSIS ONLY. It never mutates the static graph, never
 * executes repository source or tests, never runs git mutating commands and
 * never becomes an authority for Memory, Tasks, Sessions, ADRs or artifacts.
 * Git describes the change; the graph decides structural dependency; runtime
 * traces corroborate; ADRs constrain. No source overrides another.
 *
 * No LLM. No embeddings. No vector database.
 */

import type { EvidenceProfile, EvidenceClaimKind } from '../evidence/types.js';

export type ChangeMode = 'working_tree' | 'staged' | 'commit' | 'commit_range' | 'patch';

export type ChangeFileKind = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';

export interface ChangeHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  additions: number;
  deletions: number;
}

export interface FileChange {
  /** New path, or the removed path for a deletion. */
  path: string;
  /** Present only for renames/copies. */
  oldPath?: string;
  kind: ChangeFileKind;
  binary: boolean;
  hunks: ChangeHunk[];
  additions: number;
  deletions: number;
}

export type SemanticChangeKind =
  | 'SYMBOL_ADDED'
  | 'SYMBOL_MODIFIED'
  | 'SYMBOL_DELETED'
  | 'SYMBOL_RENAMED'
  | 'SIGNATURE_CHANGED'
  | 'RETURN_TYPE_CHANGED'
  | 'PARAMETER_CHANGED'
  | 'VISIBILITY_CHANGED'
  | 'IMPORT_CHANGED'
  | 'DEPENDENCY_CHANGED'
  | 'TYPE_CHANGED'
  | 'INHERITANCE_CHANGED'
  | 'IMPLEMENTATION_CHANGED'
  | 'ROUTE_ADDED'
  | 'ROUTE_CHANGED'
  | 'ROUTE_REMOVED'
  | 'EVENT_CHANNEL_CHANGED'
  | 'MANIFEST_CHANGED'
  | 'CONFIG_CHANGED'
  | 'UNKNOWN_TEXTUAL_CHANGE';

export type ChangedEntityKind = 'symbol' | 'file' | 'route' | 'event' | 'dependency' | 'config';

export interface ChangedEntity {
  /** Deterministic identity: stable across runs for the same change. */
  id: string;
  entityKind: ChangedEntityKind;
  semantic: SemanticChangeKind[];
  symbolId?: string;
  name?: string;
  qualifiedName?: string;
  filePath: string;
  oldFilePath?: string;
  /** Whether the entity exists in the baseline generation. */
  baselinePresence: boolean;
  /** Whether the entity exists in the candidate source. */
  candidatePresence: boolean;
  /** True only when a deterministic signature delta was observed. */
  signatureChanged: boolean;
  /** Public/external surface (exported, route, interface, contract). */
  publicSurface: boolean;
}

export type ImpactClassification =
  | 'direct'
  | 'transitive'
  | 'contract'
  | 'cross_service'
  | 'cross_repo'
  | 'runtime_observed'
  | 'test_related'
  | 'adr_constrained'
  | 'unresolved';

export interface ImpactPathStep {
  from: string;
  to: string;
  edgeType: string;
}

export interface ImpactEvidence {
  symbolId: string;
  name: string;
  qualifiedName?: string;
  filePath: string;
  type: string;
  /** Edge type that produced the impact. */
  relation: string;
  depth: number;
  classification: ImpactClassification[];
  origin: 'graph' | 'cross_service' | 'fleet';
  projectId: string;
  /** Semantic path from the changed entity to this node (never a bare count). */
  path: ImpactPathStep[];
  runtimeObserved?: boolean;
  runtimeObservationCount?: number;
}

export interface RuntimeImpactEvidence {
  id: string;
  kind: string;
  validation: string;
  observationCount: number;
  sessionCount: number;
  compatibility: string;
  source: { symbolId?: string; name?: string };
  target: { symbolId?: string; name?: string };
}

export interface AdrConstraintEntry {
  id: string;
  title: string;
  status: string;
}

export interface TestImpact {
  directTests: string[];
  transitiveTests: string[];
  uncoveredChangedSymbols: string[];
}

export type ChangeGapKind =
  | 'BINARY_FILE'
  | 'UNSUPPORTED_LANGUAGE'
  | 'PARSE_FAILURE'
  | 'UNMAPPED_HUNK'
  | 'GENERATED_CODE'
  | 'SOURCE_GENERATION_MISMATCH'
  | 'SENSITIVE_FILE'
  | 'EXCLUDED_PATH';

export interface ChangeGap {
  kind: ChangeGapKind;
  path?: string;
  symbolId?: string;
  detail?: string;
}

export interface ChangeCoverage {
  changedFiles: number;
  mappedFiles: number;
  changedHunks: number;
  changedSymbols: number;
  mappedSymbols: number;
  binaryFiles: number;
  unmapped: ChangeGap[];
  /** True when a bound stopped the analysis before completion. */
  truncated: boolean;
}

export type GuardDecision = 'clear' | 'review_required' | 'incomplete';

export type GuardReasonCode =
  | 'COVERAGE_PARTIAL'
  | 'COVERAGE_UNAVAILABLE'
  | 'GRAPH_STALE'
  | 'FLEET_STALE'
  | 'UNRESOLVED_REFERENCE'
  | 'AMBIGUOUS_ENDPOINT'
  | 'DELETED_SYMBOL_HAS_CALLERS'
  | 'REMOVED_ROUTE_HAS_CLIENTS'
  | 'EVENT_CHANNEL_HAS_CONSUMERS'
  | 'ADR_CONSTRAINT'
  | 'AUDIT_LIMIT_REACHED'
  | 'BINARY_CHANGE_UNANALYZED'
  | 'POST_CHANGE_GRAPH_UNAVAILABLE'
  | 'CHANGE_ANALYSIS_LIMIT_REACHED'
  | 'CHANGE_INPUT_CHANGED'
  | 'UNMAPPED_CHANGE'
  | 'UNSUPPORTED_LANGUAGE_CHANGE'
  | 'NEGATIVE_CLAIM_NOT_SAFE'
  | 'PROFILE_REQUIRES_VERIFY'
  | 'PROFILE_REQUIRES_AUDITOR'
  | 'FLEET_SCOPE_UNBOUNDED'
  | 'NO_IMPACT_POSITIVE_EVIDENCE';

export interface GuardBlocker {
  code: GuardReasonCode;
  detail?: string;
}

export interface RegressionGuardResult {
  decision: GuardDecision;
  reasons: GuardReasonCode[];
  blockers: GuardBlocker[];
  /** Change Intelligence never authorises a merge. Always false. */
  safeToMerge: false;
  /** Change Intelligence never authorises a deployment. Always false. */
  safeToDeploy: false;
}

export interface ChangeSummary {
  mode: ChangeMode;
  base?: string;
  head?: string;
  files: FileChange[];
  changedFiles: number;
  additions: number;
  deletions: number;
  binaryFiles: number;
  /** Deterministic identity of the exact input snapshot. */
  snapshotId: string;
}

export interface ChangeClaimSafety {
  decision: 'allowed' | 'provisional' | 'blocked';
  negativeClaimSafe: boolean;
  exhaustiveClaimSafe: boolean;
  reasons: string[];
}

export interface ChangeIntelligenceReport {
  profile: EvidenceProfile;
  evidenceLevel: 'provisional' | 'verified' | 'audited';

  change: ChangeSummary;

  generations: {
    baseline?: string;
    candidate?: string;
    fleet?: string;
  };

  changedEntities: ChangedEntity[];

  directImpact: ImpactEvidence[];
  transitiveImpact: ImpactEvidence[];

  crossServiceImpact: ImpactEvidence[];
  crossRepoImpact: ImpactEvidence[];

  runtimeEvidence: RuntimeImpactEvidence[];

  adrConstraints: AdrConstraintEntry[];

  tests: TestImpact;

  coverage: ChangeCoverage;
  gaps: ChangeGap[];

  guard: RegressionGuardResult;
  claimSafety: ChangeClaimSafety;

  limitations: string[];
  diagnostics: string[];

  complete: boolean;
  fingerprint: string;
}

export interface ChangeAnalysisRequest {
  projectId: string;
  mode: ChangeMode;
  base?: string;
  head?: string;
  /**
   * The claim the caller intends to make. Explicit by design; correctness must
   * never depend on parsing prose.
   */
  claim?: EvidenceClaimKind;
  profile?: EvidenceProfile;
  includeCrossService?: boolean;
  includeFleet?: boolean;
  includeRuntimeEvidence?: boolean;
  limits?: Partial<ChangeLimits>;
}

/* ------------------------------------------------------------------ *
 * Facts — the injectable change-intelligence surface
 * ------------------------------------------------------------------ */

export interface ChangeCapabilityCoverage {
  available: boolean;
  status: string;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface ChangeFleetProjectImpact {
  projectId: string;
  depth: number;
  steps: ImpactPathStep[];
}

export interface ChangeGraphFacts {
  symbols(): readonly ChangeSymbol[];
  symbolById(id: string): ChangeSymbol | undefined;
  incoming(symbolId: string, edgeTypes: readonly string[]): readonly ChangeEdge[];
  outgoing(symbolId: string, edgeTypes: readonly string[]): readonly ChangeEdge[];
  allEdges(): readonly ChangeEdge[];
}

export interface ChangeSymbol {
  id: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  /** True when the symbol is exported / part of the public surface. */
  exported?: boolean;
}

export interface ChangeEdge {
  id: string;
  type: string;
  from: string;
  to: string;
}

export interface ChangeRuntimeObservation {
  id: string;
  kind: string;
  validation: string;
  observationCount: number;
  sessionCount: number;
  compatibility: string;
  source: { symbolId?: string; name?: string };
  target: { symbolId?: string; name?: string };
}

export interface ChangeFacts {
  projectId: string;
  rootPath: string;

  /** Baseline generation the change is analysed against. */
  generation: string;
  /** Candidate generation, when a post-change index exists. */
  candidateGeneration?: string;
  /** Re-read the live generation (mid-run change detection). */
  currentGeneration(): string;

  graph: ChangeGraphFacts;

  coverageAvailable: boolean;
  coverageFor(capability: string): ChangeCapabilityCoverage;

  /** Registered Fleet scope. Absent means cross-repo claims are unbounded. */
  fleet?: {
    generation?: string;
    registeredProjects: string[];
    staleProjects: string[];
    missingProjects: string[];
  } | null;

  /** Cross-service ambiguity/unresolved state. */
  crossService?: {
    ambiguous: number;
    unresolved: number;
    dynamic: number;
    negativeClaimSafe: boolean;
    reasons: string[];
  } | null;

  /** Relevant runtime observations for a set of symbols (Phase 79). */
  runtime?(symbolIds: readonly string[]): readonly ChangeRuntimeObservation[];

  /**
   * Cross-repo impact for the changed resources, resolved through exact Fleet
   * identity only (never URL/name resemblance).
   */
  fleetImpact?(resourceIds: readonly string[]): readonly ChangeFleetProjectImpact[];

  /** Relevant accepted ADR constraints for changed paths/symbols. */
  adr?(input: {
    filePaths: string[];
    symbols: string[];
  }): readonly AdrConstraintEntry[] | Promise<readonly AdrConstraintEntry[]>;

  /** Bounded project-contained source read, used only for signature comparison. */
  readSource?(path: string, maxBytes: number): string | null;

  /** Candidate-side structural symbol extraction for added/modified files. */
  parseCandidate?(
    path: string
  ): readonly ChangeSymbol[] | null | Promise<readonly ChangeSymbol[] | null>;

  /**
   * Re-read the raw change snapshot. Used to detect a working tree / index
   * change during analysis. Must return the same deterministic snapshot id for
   * an unchanged input.
   */
  recheckSnapshot?(): Promise<string>;
}

export interface ChangeLimits {
  maxChangedFiles: number;
  maxChangedHunks: number;
  maxChangedSymbols: number;
  maxImpactDepth: number;
  maxImpactNodes: number;
  maxImpactEdges: number;
  maxFleetProjects: number;
  maxPatchBytes: number;
  maxSourceReadBytes: number;
}

export class ChangeError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ChangeError';
  }
}
