/*
 * Phase 81 — Contract Intelligence / API & Schema Compatibility Guard.
 *
 * Turns a deterministic code/schema change (reusing the Phase 80 change input)
 * into structural contract compatibility evidence: what changed on a public
 * contract surface, whether the change is structurally breaking for the
 * declared direction, and which known consumers are affected.
 *
 * This layer is ANALYSIS ONLY. It never mutates the static graph, never rewrites
 * source/schema, never fetches a remote $ref, never runs protoc or npm, never
 * executes source and never becomes an authority for Memory, Tasks, Sessions,
 * ADRs or artifacts.
 *
 * Compatibility is decided by parsed structure + explicit deterministic rules.
 * Never by text similarity, never by an LLM, never by a confidence score.
 *
 * No LLM. No embeddings. No vector database.
 */

import type { EvidenceClaimKind, EvidenceProfile } from '../evidence/types.js';

export type ContractKind =
  'http' | 'openapi' | 'graphql' | 'grpc' | 'type' | 'json_schema' | 'package_export' | 'event';

export type Compatibility = 'compatible' | 'breaking' | 'potentially_breaking' | 'unknown';

/** Which direction of the contract a structural change touches. */
export type ContractSide = 'request' | 'response' | 'contract';

export type ContractChangeCode =
  | 'CONTRACT_ADDED'
  | 'CONTRACT_REMOVED'
  | 'METHOD_CHANGED'
  | 'PATH_CHANGED'
  | 'PARAMETER_ADDED'
  | 'PARAMETER_REMOVED'
  | 'PARAMETER_TYPE_CHANGED'
  | 'PARAMETER_REQUIREDNESS_CHANGED'
  | 'FIELD_ADDED'
  | 'FIELD_REMOVED'
  | 'FIELD_TYPE_CHANGED'
  | 'FIELD_REQUIREDNESS_CHANGED'
  | 'RETURN_TYPE_CHANGED'
  | 'RESPONSE_SCHEMA_CHANGED'
  | 'ENUM_VALUE_ADDED'
  | 'ENUM_VALUE_REMOVED'
  | 'OPERATION_ADDED'
  | 'OPERATION_REMOVED'
  | 'RPC_METHOD_ADDED'
  | 'RPC_METHOD_REMOVED'
  | 'PROTO_FIELD_NUMBER_CHANGED'
  | 'PROTO_FIELD_REMOVED'
  | 'PROTO_FIELD_TYPE_CHANGED'
  | 'EXPORT_ADDED'
  | 'EXPORT_REMOVED'
  | 'EVENT_SCHEMA_CHANGED'
  | 'UNKNOWN_CONTRACT_CHANGE';

export type ContractReasonCode =
  | 'CONTRACT_REMOVED'
  | 'REQUIRED_PARAMETER_ADDED'
  | 'PARAMETER_TYPE_CHANGED'
  | 'RESPONSE_FIELD_REMOVED'
  | 'RESPONSE_TYPE_CHANGED'
  | 'GRAPHQL_FIELD_REMOVED'
  | 'GRAPHQL_REQUIRED_ARGUMENT_ADDED'
  | 'GRAPHQL_NULLABILITY_TIGHTENED'
  | 'RPC_METHOD_REMOVED'
  | 'PROTO_FIELD_NUMBER_CHANGED'
  | 'PROTO_FIELD_TYPE_CHANGED'
  | 'EXPORT_REMOVED'
  | 'PUBLIC_TYPE_CHANGED'
  | 'EVENT_CHANNEL_REMOVED'
  | 'EVENT_SCHEMA_CHANGED'
  | 'CONTRACT_COVERAGE_PARTIAL'
  | 'CONTRACT_SCHEMA_UNSUPPORTED'
  | 'BASELINE_CONTRACT_UNAVAILABLE'
  | 'CANDIDATE_CONTRACT_UNAVAILABLE'
  | 'CONSUMER_COVERAGE_PARTIAL'
  | 'REMOTE_CONTRACT_REF_BLOCKED'
  | 'CONTRACT_PATH_ESCAPE_BLOCKED'
  | 'CONTRACT_REF_CYCLE'
  | 'CONTRACT_GENERATION_CHANGED'
  | 'CONTRACT_INPUT_CHANGED'
  | 'CONTRACT_ANALYSIS_LIMIT_REACHED'
  | 'FLEET_STALE'
  | 'FLEET_SCOPE_UNBOUNDED'
  | 'UNRESOLVED_REFERENCE'
  | 'AMBIGUOUS_ENDPOINT'
  | 'ADR_CONSTRAINT'
  | 'PROFILE_REQUIRES_VERIFY'
  | 'PROFILE_REQUIRES_AUDITOR'
  | 'NEGATIVE_CLAIM_NOT_SAFE'
  | 'NO_BREAKING_CONTRACT_CHANGE';

/**
 * One structural field on one side of a contract.
 *
 * `type` is a canonical scalar/kind, not raw source text: language-specific
 * spellings are normalised so a compatible rename of an equivalent type does
 * not look breaking.
 */
export interface ContractField {
  name: string;
  type: string;
  required: boolean;
  repeated?: boolean;
  /** Protobuf field number — part of the wire contract identity. */
  number?: number;
  /** GraphQL nullability (`String` = nullable, `String!` = non-null). */
  nullable?: boolean;
  /** Enum values, when the field is an enum. */
  enumValues?: string[];
}

export interface ContractShape {
  fields: ContractField[];
}

export interface ContractEntry {
  /** Deterministic: kind + canonical identity. */
  id: string;
  kind: ContractKind;
  /** Canonical identity, e.g. `POST /orders`, `Query.orders`, `OrderService/Create`. */
  identity: string;
  sourcePath: string;
  serviceId?: string;
  method?: string;
  path?: string;
  request: ContractShape;
  response: ContractShape;
}

export type ContractUnsupportedReason =
  | 'UNSUPPORTED_FORMAT'
  | 'UNSUPPORTED_VERSION'
  | 'PARSE_FAILURE'
  | 'UNSUPPORTED_CONSTRUCT'
  | 'OVERSIZED_SOURCE'
  | 'SENSITIVE_FILE';

export interface ContractUnsupported {
  path: string;
  reason: ContractUnsupportedReason;
  detail?: string;
}

export type ContractRefReason =
  'REMOTE_REF' | 'PATH_ESCAPE' | 'UNRESOLVED_REF' | 'REF_CYCLE' | 'REF_DEPTH_EXCEEDED';

export interface ContractUnresolvedRef {
  path: string;
  ref: string;
  reason: ContractRefReason;
}

export interface ContractSnapshot {
  generation: string;
  /** Deterministic fingerprint of the normalised contract set. */
  fingerprint: string;
  entries: ContractEntry[];
  unsupported: ContractUnsupported[];
  unresolvedRefs: ContractUnresolvedRef[];
}

export interface ContractChangeEntry {
  code: ContractChangeCode;
  side: ContractSide;
  /** Field / operation name the change applies to, when applicable. */
  field?: string;
  detail: string;
  reason?: ContractReasonCode;
}

export interface ContractDelta {
  contractId: string;
  kind: ContractKind;
  identity: string;
  sourcePath: string;
  compatibility: Compatibility;
  baselineFingerprint?: string;
  candidateFingerprint?: string;
  changes: ContractChangeEntry[];
}

export interface ConsumerImpact {
  contractId: string;
  identity: string;
  relation: string;
  symbolId: string;
  name: string;
  filePath: string;
  origin: 'local' | 'cross_service' | 'fleet';
  projectId: string;
  runtimeObserved?: boolean;
  runtimeObservationCount?: number;
}

export interface CompatibilitySummary {
  overall: Compatibility;
  contracts: number;
  breaking: number;
  potentiallyBreaking: number;
  compatible: number;
  unknown: number;
  consumers: { local: number; crossService: number; fleet: number };
}

export type ContractGuardDecision = 'compatible' | 'review_required' | 'incomplete';

export interface ContractGuardResult {
  decision: ContractGuardDecision;
  reasons: ContractReasonCode[];
  blockers: Array<{ code: ContractReasonCode; detail?: string }>;
  /** Contract Intelligence never authorises a merge. Always false. */
  safeToMerge: false;
  /** Contract Intelligence never authorises a deployment. Always false. */
  safeToDeploy: false;
}

export interface ContractClaimSafety {
  decision: 'allowed' | 'provisional' | 'blocked';
  negativeClaimSafe: boolean;
  exhaustiveClaimSafe: boolean;
  reasons: string[];
}

export interface ContractCoverage {
  filesChecked: number;
  filesParsed: number;
  supportedKinds: ContractKind[];
  unsupported: ContractUnsupported[];
  unresolvedRefs: ContractUnresolvedRef[];
  /** Changed contract paths whose baseline content was unavailable. */
  baselinesUnavailable: string[];
  /** Changed contract paths whose candidate content was unavailable. */
  candidatesUnavailable: string[];
  consumerCoveragePartial: boolean;
  truncated: boolean;
}

export interface ContractSnapshotSummary {
  generation: string;
  fingerprint: string;
  entries: number;
  unsupported: number;
  unresolvedRefs: number;
}

export interface ContractRuntimeEvidence {
  id: string;
  kind: string;
  validation: string;
  observationCount: number;
  sessionCount: number;
  compatibility: string;
  source: { symbolId?: string; name?: string };
  target: { symbolId?: string; name?: string };
}

export interface ContractAdrConstraint {
  id: string;
  title: string;
  status: string;
}

export interface ContractIntelligenceReport {
  profile: EvidenceProfile;
  evidenceLevel: 'provisional' | 'verified' | 'audited';

  generations: {
    baseline?: string;
    candidate?: string;
    fleet?: string;
  };

  baseline: ContractSnapshotSummary;
  candidate: ContractSnapshotSummary;

  changes: ContractDelta[];

  compatibility: CompatibilitySummary;

  consumers: ConsumerImpact[];

  runtimeEvidence: ContractRuntimeEvidence[];

  adrConstraints: ContractAdrConstraint[];

  coverage: ContractCoverage;

  guard: ContractGuardResult;
  claimSafety: ContractClaimSafety;

  limitations: string[];
  diagnostics: string[];

  complete: boolean;
  fingerprint: string;
}

export interface ContractAnalysisRequest {
  projectId: string;
  /**
   * The claim the caller intends to make. Explicit by design; correctness must
   * never depend on parsing prose.
   */
  claim?: EvidenceClaimKind;
  profile?: EvidenceProfile;
  includeCrossService?: boolean;
  includeFleet?: boolean;
  includeRuntimeEvidence?: boolean;
  limits?: Partial<ContractLimits>;
}

/* ------------------------------------------------------------------ *
 * Facts — the injectable contract-intelligence surface
 * ------------------------------------------------------------------ */

export interface ContractCapabilityCoverage {
  available: boolean;
  status: string;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface ContractSymbol {
  id: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  exported?: boolean;
}

export interface ContractEdge {
  id: string;
  type: string;
  from: string;
  to: string;
}

export interface ContractGraphFacts {
  symbols(): readonly ContractSymbol[];
  symbolById(id: string): ContractSymbol | undefined;
  incoming(symbolId: string, edgeTypes: readonly string[]): readonly ContractEdge[];
  outgoing(symbolId: string, edgeTypes: readonly string[]): readonly ContractEdge[];
}

export interface ContractFleetFacts {
  generation?: string;
  registeredProjects: string[];
  staleProjects: string[];
  missingProjects: string[];
}

export interface ContractCrossServiceFacts {
  ambiguous: number;
  unresolved: number;
  dynamic: number;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface ContractFleetProjectImpact {
  projectId: string;
  depth: number;
  steps: Array<{ from: string; to: string; edgeType: string }>;
}

export interface ContractRuntimeObservation {
  id: string;
  kind: string;
  validation: string;
  observationCount: number;
  sessionCount: number;
  compatibility: string;
  source: { symbolId?: string; name?: string };
  target: { symbolId?: string; name?: string };
}

export interface ContractFacts {
  projectId: string;
  rootPath: string;

  /** Baseline generation the change is analysed against. */
  generation: string;
  /** Candidate generation, when a post-change index exists. */
  candidateGeneration?: string;
  /** Re-read the live generation (mid-run change detection). */
  currentGeneration(): string;

  graph: ContractGraphFacts;

  coverageAvailable: boolean;
  coverageFor(capability: string): ContractCapabilityCoverage;

  /** Whether a real producer exists for a capability/edge vocabulary. */
  capabilityProduced?(capability: string, edgeType?: string): boolean;

  fleet?: ContractFleetFacts | null;

  crossService?: ContractCrossServiceFacts | null;

  runtime?(symbolIds: readonly string[]): readonly ContractRuntimeObservation[];

  fleetImpact?(resourceIds: readonly string[]): readonly ContractFleetProjectImpact[];

  adr?(input: {
    filePaths: string[];
    symbols: string[];
  }): readonly ContractAdrConstraint[] | Promise<readonly ContractAdrConstraint[]>;

  /**
   * Changed paths from the Phase 80 change snapshot. Contract analysis never
   * re-reads git: it consumes the Phase 80 change input.
   */
  changedPaths(): readonly string[];

  /**
   * Phase 80 file change kind for a path. Lets an added file legitimately lack
   * a baseline and a deleted file legitimately lack a candidate without being
   * reported as a missing contract generation.
   */
  fileKind?(path: string): 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | undefined;

  /** Candidate-side structural symbols for a path (reuses Phase 80 facts). */
  parseCandidate?(
    path: string
  ): readonly ContractSymbol[] | null | Promise<readonly ContractSymbol[] | null>;

  /** Bounded baseline source read (e.g. `git show <base>:<path>`), read-only. */
  readBaseline?(path: string, maxBytes: number): string | null | Promise<string | null>;

  /** Bounded candidate source read (working tree), read-only. */
  readCandidate?(path: string, maxBytes: number): string | null | Promise<string | null>;

  /** Re-read the raw change snapshot id (mid-run change detection). */
  recheckSnapshot?(): Promise<string>;

  /** Contract kinds this install declares as supported. */
  supportedKinds?(): readonly ContractKind[];
}

export interface ContractLimits {
  maxContractFiles: number;
  maxContracts: number;
  maxSchemaNodes: number;
  maxRefDepth: number;
  maxContractChanges: number;
  maxConsumers: number;
  maxFleetProjects: number;
  maxSourceReadBytes: number;
}

export class ContractError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ContractError';
  }
}
