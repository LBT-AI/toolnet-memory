/*
 * Phase 78 — Evidence Profiles.
 *
 * Scout / Verify / Auditor decide how much proof a claim requires before
 * ToolNet will let an agent assert it. The layer is deterministic: it
 * orchestrates the existing graph, coverage, cross-service, Fleet and
 * source-verification facilities and never introduces its own graph.
 *
 * No LLM. No embeddings. No vector database.
 */

import type { GraphCapability, GraphCoverageStatus } from '../graph-coverage/types.js';

export type EvidenceProfile = 'scout' | 'verify' | 'auditor';

/**
 * Capabilities the evidence layer can reason about.
 *
 * `fleet_graph` and `source_fallback` are evidence-layer capabilities; the rest
 * mirror the Phase 68 coverage contract.
 */
export type EvidenceCapability = GraphCapability | 'fleet_graph' | 'source_fallback';

export type EvidenceClaimKind =
  'positive' | 'negative' | 'exhaustive' | 'impact' | 'dead_code' | 'absence' | 'uniqueness';

export type EvidenceScopeKind = 'project' | 'service' | 'path' | 'symbol' | 'fleet';

export interface EvidenceScope {
  kind: EvidenceScopeKind;
  /** Required for `fleet`: the explicit registered Fleet scope. */
  projectIds?: string[];
  /** Required for `path`. */
  paths?: string[];
  /** Required for `symbol`. */
  symbolIds?: string[];
  /** Required for `service`. */
  serviceIds?: string[];
}

export type EvidenceOperation =
  | 'find_symbol'
  | 'find_callers'
  | 'find_dependents'
  | 'graph_path'
  | 'dead_code'
  | 'impact'
  | 'cross_service_endpoint'
  | 'fleet_dependency'
  | 'query';

export interface EvidenceSubject {
  symbolId?: string;
  name?: string;
  path?: string;
  fromSymbolId?: string;
  toSymbolId?: string;
  route?: string;
  protocol?: string;
  package?: string;
  query?: string;
}

export interface EvidenceRequest {
  profile: EvidenceProfile;
  operation: EvidenceOperation;
  /**
   * The claim the caller intends to make. Explicit by design: correctness must
   * never depend on parsing natural-language keywords.
   */
  claim: EvidenceClaimKind;
  scope: EvidenceScope;
  subject?: EvidenceSubject;
  options?: EvidenceRequestOptions;
  /**
   * Phase 75 ADR context. Never used to compute claim safety; only attached as
   * architecture constraints.
   */
  adrConstraints?: EvidenceAdrConstraint[];
}

export interface EvidenceRequestOptions {
  maxDepth?: number;
  maxRows?: number;
  maxProjects?: number;
  pageSize?: number;
  maxPages?: number;
  /** Ask for the cross-service capability in addition to the project graph. */
  includeCrossService?: boolean;
  /** Ask for the Fleet capability (cross-repo). */
  includeCrossRepo?: boolean;
  /** Target a specific cross-project edge vocabulary (e.g. CROSS_RPC_CALLS). */
  edgeType?: string;
  /** Request source fallback for recorded gaps (profiles control whether it runs). */
  sourceFallback?: boolean;
  /**
   * Phase 79: attach compatible runtime trace observations as supporting
   * evidence. Runtime data can only ever STRENGTHEN a positive finding; it can
   * never make a negative or exhaustive claim safer.
   */
  includeRuntimeTrace?: boolean;
  /** Expected generation; an audit that observes a different one is invalid. */
  expectedGeneration?: string;
}

export interface EvidenceAdrConstraint {
  id: string;
  title: string;
  status: string;
}

/* ------------------------------------------------------------------ *
 * Facts — the injectable evidence surface
 * ------------------------------------------------------------------ */

export interface EvidenceSymbol {
  id: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
}

export interface EvidenceEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  /** Edge provenance from Phase 71; preserved in the bundle. */
  origin?: string;
  certainty?: string;
  generation?: string;
}

export type EvidenceGapKind =
  | 'unresolved_reference'
  | 'ambiguous_reference'
  | 'dynamic_target'
  | 'parse_failure'
  | 'unsupported_language'
  | 'skipped_sensitive'
  | 'reserved_capability';

export interface EvidenceGap {
  kind: EvidenceGapKind;
  capability: EvidenceCapability;
  path?: string;
  line?: number;
  detail?: string;
}

export interface EvidenceCapabilityCoverage {
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface EvidenceFleetFacts {
  generation: string;
  registeredProjects: string[];
  staleProjects: string[];
  missingProjects: string[];
  crossProjectEdges: number;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface EvidenceCrossServiceFacts {
  generation: string;
  ambiguous: number;
  unresolved: number;
  dynamic: number;
  unsupportedFrameworks: string[];
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface EvidenceSourceReadResult {
  path: string;
  matches: Array<{ line: number; text: string }>;
  truncated: boolean;
}

/**
 * The deterministic evidence surface.
 *
 * The MCP layer builds this from the hydrated project; certification builds it
 * from fixtures. The executor only ever reads through this interface, so it can
 * never mutate the graph and never loads a second copy.
 */
/* ------------------------------------------------------------------
 * Phase 79 — runtime trace evidence
 * ------------------------------------------------------------------ */

/**
 * One aggregated runtime observation, projected for evidence reporting.
 *
 * Provenance is explicit: session and event identity, observation count and
 * graph-generation compatibility. There is no vague "runtime confirmed".
 */
export interface EvidenceRuntimeObservation {
  id: string;
  kind: string;
  validation: string;
  observationCount: number;
  sessionCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  compatibility: string;
  staticEdgeIds: string[];
  source: { symbolId?: string; name?: string };
  target: { symbolId?: string; name?: string };
}

/**
 * Runtime facts available to the evidence layer.
 *
 * `canEstablishAbsence` is a literal `false`. Phase 79 implements no trace
 * completeness contract, so runtime absence is never proof of absence and can
 * never turn a blocked claim into an allowed one.
 */
export interface EvidenceRuntimeFacts {
  available: boolean;
  compatibility: string;
  graphGeneration?: string;
  sessions: number;
  observations: number;
  relevant: EvidenceRuntimeObservation[];
  /** Symbols proven to have executed in at least one imported session. */
  executedSymbolIds: string[];
  reasons: string[];
}

/** Bundle section describing what runtime evidence contributed. */
export interface EvidenceRuntimeReport {
  requested: boolean;
  available: boolean;
  compatibility: string;
  sessions: number;
  observations: number;
  relevant: number;
  /** Always false in Phase 79. */
  canEstablishAbsence: false;
  items: EvidenceRuntimeObservation[];
  reasons: string[];
}

export interface EvidenceFacts {
  projectId: string;
  rootPath: string;

  /** Generation pinned when the evidence run starts. */
  generation: string;
  /** Re-read the live generation (used to detect a mid-audit change). */
  currentGeneration(): string;

  freshness: { checked: boolean; stale: boolean };

  coverageAvailable: boolean;
  coverageFor(capability: EvidenceCapability): EvidenceCapabilityCoverage;

  /** Whether a real producer exists for a capability/edge vocabulary. */
  capabilityProduced(capability: EvidenceCapability, edgeType?: string): boolean;

  symbols(): readonly EvidenceSymbol[];
  symbolById(id: string): EvidenceSymbol | undefined;
  incoming(symbolId: string, edgeTypes: readonly string[]): readonly EvidenceEdge[];
  outgoing(symbolId: string, edgeTypes: readonly string[]): readonly EvidenceEdge[];

  gaps(): readonly EvidenceGap[];

  fleet(): EvidenceFleetFacts | null;
  crossService(): EvidenceCrossServiceFacts | null;

  /**
   * Phase 79: compatible runtime observations relevant to the requested
   * subject. Absent (or null) means "no runtime evidence", never "nothing
   * runs".
   */
  runtime?(subject: { symbolIds?: readonly string[]; name?: string }): EvidenceRuntimeFacts | null;

  /**
   * Bounded source read for source fallback. Implementations MUST reject paths
   * outside the project root and MUST refuse sensitive files.
   */
  readSource?(path: string, needle: string, maxMatches: number): EvidenceSourceReadResult;

  /** Page index at which a pagination cursor becomes stale (test seam). */
  staleAfterPage?: number;
}

/* ------------------------------------------------------------------ *
 * Plan
 * ------------------------------------------------------------------ */

export interface EvidenceRequirement {
  capability: EvidenceCapability;
  /** The claim depends on this capability's coverage being safe. */
  requiredForNegative: boolean;
  /** A real producer must exist (reserved vocabulary does not count). */
  producerRequired: boolean;
}

export interface EvidenceLimits {
  maxDepth: number;
  maxRows: number;
  maxProjects: number;
  maxPages: number;
  pageSize: number;
}

export interface EvidencePlan {
  profile: EvidenceProfile;
  operation: EvidenceOperation;
  claim: EvidenceClaimKind;
  scope: EvidenceScope;

  requirements: EvidenceRequirement[];
  limits: EvidenceLimits;

  needFreshness: boolean;
  needPaginationComplete: boolean;
  needSourceFallback: boolean;

  needsFleet: boolean;
  needsCrossService: boolean;

  /** Deterministic request fingerprint (profile + scope + claim + subject). */
  fingerprint: string;
}

/* ------------------------------------------------------------------ *
 * Result
 * ------------------------------------------------------------------ */

export type EvidenceOrigin =
  'graph' | 'coverage' | 'source_fallback' | 'fleet' | 'adr_constraint' | 'runtime_trace';

export type EvidenceItem =
  | {
      origin: 'graph';
      kind: 'symbol';
      id: string;
      symbol: EvidenceSymbol;
      generation: string;
    }
  | {
      origin: 'graph';
      kind: 'edge';
      id: string;
      edge: EvidenceEdge;
      generation: string;
    }
  | {
      origin: 'graph';
      kind: 'path';
      id: string;
      symbols: string[];
      edges: EvidenceEdge[];
      generation: string;
    }
  | {
      origin: 'source_fallback';
      kind: 'source_match';
      id: string;
      path: string;
      line: number;
      method: 'lexical_exact_reference';
    }
  | {
      origin: 'fleet';
      kind: 'project';
      id: string;
      projectId: string;
      availability: 'available' | 'stale' | 'missing';
    }
  | {
      origin: 'coverage';
      kind: 'gap';
      id: string;
      gap: EvidenceGap;
    }
  | {
      origin: 'runtime_trace';
      kind: 'observation';
      id: string;
      observation: EvidenceRuntimeObservation;
    };

export interface ClaimSafety {
  decision: 'allowed' | 'provisional' | 'blocked';
  negativeClaimSafe: boolean;
  exhaustiveClaimSafe: boolean;
  reasons: string[];
}

export interface EvidencePagination {
  complete: boolean;
  pages: number;
  rows: number;
  truncated: boolean;
}

export interface EvidenceSourceFallbackReport {
  requested: boolean;
  performed: boolean;
  gapsChecked: string[];
  matches: number;
  skipped: Array<{ path: string; reason: string }>;
}

export interface EvidenceUnresolvedReport {
  total: number;
  relevant: number;
  ambiguous: number;
  dynamic: number;
  items: EvidenceGap[];
}

export interface EvidenceBundle {
  profile: EvidenceProfile;
  evidenceLevel: 'provisional' | 'verified' | 'audited';

  operation: EvidenceOperation;
  claim: EvidenceClaimKind;
  scope: EvidenceScope;

  generation: { project: string; fleet?: string };

  requirements: EvidenceRequirement[];
  evidence: EvidenceItem[];

  coverage: Array<{
    capability: EvidenceCapability;
    status: GraphCoverageStatus;
    negativeClaimSafe: boolean;
    reasons: string[];
  }>;

  pagination: EvidencePagination;
  sourceFallback: EvidenceSourceFallbackReport;
  unresolved: EvidenceUnresolvedReport;

  /**
   * Phase 79 runtime evidence. Additive and never authoritative: it can
   * corroborate a positive finding but can never make absence safe.
   */
  runtime: EvidenceRuntimeReport;

  claimSafety: ClaimSafety;
  limitations: string[];
  diagnostics: string[];

  adrConstraints: EvidenceAdrConstraint[];

  complete: boolean;
  fingerprint: string;
}

export class EvidenceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'EvidenceError';
  }
}
