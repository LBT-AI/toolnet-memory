/*
 * Phase 73 — Cross-Repo Intelligence / Fleet Graph.
 *
 * A Fleet is a derived overlay over *project* graphs. It never contains the
 * full symbol/edge set of any project: only project identity plus
 * cross-project relationships (and the minimal resource identities needed to
 * link them).
 *
 * No LLM. No embeddings. No vector database. No network access.
 * No repository cloning. No fuzzy matching.
 */

import type { GraphCoverageStatus } from '../graph-coverage/types.js';

export type FleetSchemaVersion = 1;
export const FLEET_SCHEMA_VERSION: FleetSchemaVersion = 1;

export type FleetProjectAvailability = 'available' | 'derived' | 'unavailable';

export type CrossProjectEdgeType =
  | 'CROSS_HTTP_CALLS'
  | 'CROSS_RPC_CALLS'
  | 'CROSS_GRAPHQL_CALLS'
  | 'CROSS_TRPC_CALLS'
  | 'CROSS_EMITS'
  | 'CROSS_LISTENS_ON'
  | 'CROSS_PACKAGE_DEPENDS_ON';

/**
 * Deterministic evidence kinds. There is deliberately no confidence score.
 */
export type CrossProjectEvidenceKind =
  | 'SERVICE_IDENTITY'
  | 'HOST_MATCH'
  | 'METHOD_MATCH'
  | 'CANONICAL_ROUTE_MATCH'
  | 'OPERATION_MATCH'
  | 'PROVIDER_MATCH'
  | 'CHANNEL_MATCH'
  | 'PACKAGE_IDENTITY'
  | 'LOCAL_DEPENDENCY_SPECIFIER';

export interface CrossProjectEvidence {
  kind: CrossProjectEvidenceKind;
  /** Redacted, bounded detail (never source text or credentials). */
  detail?: string;
}

export interface CrossProjectEdge {
  id: string;
  type: CrossProjectEdgeType;

  fromProjectId: string;
  toProjectId: string;

  fromResourceId: string;
  toResourceId: string;

  protocol?: string;

  evidence: CrossProjectEvidence[];

  /** Generation of the producing project graph when the edge was derived. */
  sourceGeneration: string;
  /** Generation of the consuming project graph when the edge was derived. */
  targetGeneration: string;

  /** Deterministic Fleet generation that produced this edge. */
  generation: string;

  metadata?: Record<string, unknown>;
}

export type UnresolvedCrossProjectReason =
  | 'AMBIGUOUS_CROSS_PROJECT_ENDPOINT'
  | 'NO_MATCHING_ENDPOINT'
  | 'UNKNOWN_HOST'
  | 'DYNAMIC_CROSS_PROJECT_TARGET'
  | 'AMBIGUOUS_EVENT_CHANNEL'
  | 'UNRESOLVED_PACKAGE_IDENTITY'
  | 'UNSUPPORTED_PROTOCOL';

export interface UnresolvedCrossProjectReference {
  type: CrossProjectEdgeType;
  protocol?: string;

  fromProjectId: string;
  fromResourceId: string;

  reason: UnresolvedCrossProjectReason;

  /** Candidate target project ids, bounded and sorted. */
  candidates?: string[];

  /** Redacted, bounded detail. */
  detail?: string;
}

export interface FleetProjectRef {
  projectId: string;
  name: string;
  remoteIdentity?: string;
  availability: FleetProjectAvailability;

  graphGeneration: string;
  graphFingerprint: string;

  updatedAt: string;

  /** True when the pinned generation no longer matches the export. */
  stale: boolean;
}

export interface FleetStats {
  registeredProjects: number;
  availableProjects: number;
  staleProjects: number;
  crossProjectEdges: number;
  crossProjectEdgesByType: Record<string, number>;
  unresolved: number;
}

export interface FleetCoverageReasons {
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  reasons: FleetCoverageReason[];
  projects: string[];
  missingProjects: string[];
  staleProjects: string[];

  /**
   * Snapshot generation this coverage belongs to.
   *
   * Phase 86E: coverage is published for exactly one snapshot generation, so
   * coverage from snapshot A can never be read as current for snapshot B.
   * Optional so snapshots written before 86E stay readable.
   */
  generation?: string;
}

export type FleetCoverageReason =
  | 'FLEET_EMPTY'
  | 'FLEET_PROJECT_UNAVAILABLE'
  | 'FLEET_PROJECT_STALE'
  | 'FLEET_CROSS_REPO_AMBIGUOUS'
  | 'FLEET_CROSS_REPO_UNRESOLVED'
  | 'FLEET_SHARED_PACKAGE_UNRESOLVED'
  | 'FLEET_HOST_UNKNOWN'
  | 'FLEET_CROSS_SERVICE_PARTIAL';

export interface FleetSnapshot {
  version: FleetSchemaVersion;
  generation: string;
  fingerprint: string;
  indexedAt: string;

  projects: FleetProjectRef[];
  edges: CrossProjectEdge[];
  unresolved: UnresolvedCrossProjectReference[];
  coverage: FleetCoverageReasons;

  stats: FleetStats;
}

/* ------------------------------------------------------------------ *
 * Project export view — the ONLY project data the Fleet Builder sees. *
 * ------------------------------------------------------------------ */

export interface FleetExportService {
  id: string;
  name: string;
  rootPath: string;
  kind: string;
}

export interface FleetExportEndpoint {
  /** Deterministic project-local resource id (route symbol id). */
  resourceId: string;
  protocol: 'http' | 'grpc' | 'graphql' | 'trpc';
  serviceId: string;
  method?: string;
  /** Canonical path for http endpoints. */
  path?: string;
  /** Canonical operation identity for rpc/graphql/trpc endpoints. */
  operation?: string;
  handlerSymbolId?: string;
}

export interface FleetExportOutboundCall {
  protocol: 'http' | 'grpc' | 'graphql' | 'trpc';
  serviceId?: string;
  callerSymbolId?: string;
  filePath: string;
  line: number;
  method?: string;
  /** Canonical path when statically proven, otherwise null (dynamic). */
  path: string | null;
  /** Declared host/origin evidence (redacted), when present. */
  host?: string;
  /** Redacted raw target for diagnostics. */
  rawTarget?: string;
}

export interface FleetExportEvent {
  resourceId: string;
  provider: string;
  channel: string;
  direction: 'emit' | 'listen';
  symbolId?: string;
  serviceId?: string;
}

export interface FleetExportPackage {
  /** Canonical package identity (e.g. `@company/shared`). */
  id: string;
  name: string;
  /** Manifest that declares the package. */
  manifest: string;
  source: 'npm' | 'python' | 'go' | 'cargo';
}

export interface FleetExportPackageDependency {
  /** Canonical dependency name as written in the manifest. */
  name: string;
  /** Raw specifier (redacted). */
  specifier: string;
  /** True when the specifier proves a local/workspace dependency. */
  local: boolean;
  manifest: string;
  source: 'npm' | 'python' | 'go' | 'cargo';
}

export interface FleetProjectExport {
  version: FleetSchemaVersion;
  projectId: string;
  name: string;
  remote?: string;

  generation: string;
  graphFingerprint: string;
  indexedAt: string;

  /**
   * True when the project's Phase 72 cross-service layer is complete (no
   * dynamic, ambiguous, unresolved or unsupported-framework signal).
   */
  crossServiceComplete: boolean;

  /**
   * Canonical, lower-cased identity strings that may appear as a host or
   * service name in another project (package name, repository name, service
   * names, explicit declarations). Never contains credentials.
   */
  identities: string[];

  services: FleetExportService[];
  endpoints: FleetExportEndpoint[];
  outboundCalls: FleetExportOutboundCall[];
  events: FleetExportEvent[];
  packages: FleetExportPackage[];
  packageDependencies: FleetExportPackageDependency[];
}

export interface FleetProjectInput {
  projectId: string;
  name: string;
  remote?: string;
  rootPath?: string;
  /** Pinned generation from the fleet registry (staleness detection). */
  pinnedGeneration?: string;
  export: FleetProjectExport | null;
}

export interface FleetBuildResult {
  snapshot: FleetSnapshot;
  /** Projects whose export was unavailable or generation-mismatched. */
  staleProjects: string[];
  missingProjects: string[];
}
