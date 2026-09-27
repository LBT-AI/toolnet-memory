/*
 * Phase 76 — Portable Code Intelligence Artifact.
 *
 * IMPORTANT AUTHORITY BOUNDARY
 *
 * The artifact is DERIVED STATE. It is never an authority for Memory, Tasks,
 * Sessions, the Task WAL, ADRs, the Wiki or the Project Manual. Hydrating an
 * artifact may only restore rebuildable code-intelligence state and must never
 * write outside this module's declared component keys.
 */

export const ARTIFACT_SCHEMA_VERSION = 1;

/** Container magic. Stored uncompressed at the head of the gzip payload. */
export const ARTIFACT_MAGIC = 'TNA1';

/** Container layout version (magic + header framing). */
export const ARTIFACT_CONTAINER_VERSION = 1;

export type ArtifactComponentName =
  | 'graph'
  | 'code-manifest'
  | 'coverage'
  | 'resolution'
  | 'cross-service'
  | 'fleet-export'
  | 'architecture'
  | 'analysis'
  | 'visualization';

/**
 * A component that is intentionally never shipped: it is derived and rebuilt
 * locally by the hydrated runtime.
 */
export interface ArtifactNonPortableComponent {
  name: string;
  reason: 'REBUILT_LOCALLY';
  detail: string;
}

export interface ArtifactComponentSpec {
  name: ArtifactComponentName;
  /** Required components must be present for the artifact to be adoptable. */
  kind: 'required' | 'optional';
  /** Portable components travel inside the archive. */
  portable: boolean;
  schemaVersion: number;
  /** Project-scoped logical storage key; `<projectId>` is substituted. */
  key: string;
  description: string;
}

export interface ArtifactComponentManifest {
  name: ArtifactComponentName;
  kind: 'required' | 'optional';
  portable: boolean;
  schemaVersion: number;
  sha256: string;
  size: number;
}

export interface ArtifactSourceIdentity {
  /** Digest over the canonical source manifest (paths + hashes). */
  manifestHash: string;
  fileCount: number;
  /** Informational only: never part of generation identity. */
  manifestUpdatedAt: string;
}

export interface ArtifactFingerprints {
  parser: string;
  resolver: string;
  graphSemantics: string;
  querySchema: string;
  artifactSchema: string;
}

export interface ArtifactIntegrity {
  algorithm: 'sha256';
  /** Hash of the immutable archive bytes. */
  artifactHash: string;
  /** Hash of the canonical manifest body (integrity block excluded). */
  manifestHash: string;
}

export interface ArtifactKnowledgeCompatibility {
  /**
   * Diagnostics only. A mismatch never invalidates the code graph, and the
   * artifact can never create, overwrite, delete or supersede an ADR.
   */
  adrRevisionObserved?: number;
}

export interface CodeIntelligenceArtifactManifest {
  version: typeof ARTIFACT_SCHEMA_VERSION;
  artifactSchemaVersion: number;
  containerVersion: number;

  projectId: string;
  /** Canonical project identity (normalized remote, else name). */
  projectIdentity: string;

  generation: string;
  createdAt: string;

  source: ArtifactSourceIdentity;
  fingerprints: ArtifactFingerprints;
  capabilities: string[];

  components: ArtifactComponentManifest[];
  nonPortableComponents: ArtifactNonPortableComponent[];

  knowledgeCompatibility?: ArtifactKnowledgeCompatibility;

  stats: {
    symbols: number;
    edges: number;
  };

  integrity: ArtifactIntegrity;
}

export interface ArtifactCurrentPointer {
  version: 1;
  generation: string;
  manifestSha256: string;
  artifactSha256: string;
  updatedAt: string;
}

export type ArtifactReasonCode =
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_MANIFEST_MISSING'
  | 'ARTIFACT_SCHEMA_UNSUPPORTED'
  | 'ARTIFACT_CONTAINER_UNSUPPORTED'
  | 'PARSER_FINGERPRINT_MISMATCH'
  | 'RESOLVER_FINGERPRINT_MISMATCH'
  | 'SEMANTIC_SCHEMA_MISMATCH'
  | 'QUERY_SCHEMA_MISMATCH'
  | 'ARTIFACT_PROJECT_MISMATCH'
  | 'ARTIFACT_IDENTITY_MISMATCH'
  | 'ARTIFACT_HASH_MISMATCH'
  | 'ARTIFACT_COMPONENT_HASH_MISMATCH'
  | 'ARTIFACT_COMPONENT_MISSING'
  | 'ARTIFACT_COMPONENT_INVALID'
  | 'ARTIFACT_COMPONENT_TOO_LARGE'
  | 'ARTIFACT_MANIFEST_INVALID'
  | 'ARTIFACT_TOO_LARGE'
  | 'ARTIFACT_TRUNCATED'
  | 'ARTIFACT_DECOMPRESSION_LIMIT'
  | 'ARTIFACT_GENERATION_CONFLICT'
  | 'ARTIFACT_SOURCE_MISMATCH'
  | 'ARTIFACT_GRAPH_INVALID'
  | 'ARTIFACT_IO_ERROR';

export class ArtifactError extends Error {
  constructor(
    public readonly code: ArtifactReasonCode,
    message: string
  ) {
    super(message);
    this.name = 'ArtifactError';
  }
}

export interface ArtifactAdoptionCheck {
  adoptable: boolean;
  reason?: ArtifactReasonCode;
  detail?: string;
  /** True when the local graph already matches the artifact generation. */
  identical?: boolean;
}

export interface ArtifactExportResult {
  generation: string;
  manifest: CodeIntelligenceArtifactManifest;
  artifactPath: string;
  artifactSha256: string;
  artifactBytes: number;
}

export interface ArtifactPublishResult {
  generation: string;
  artifactSha256: string;
  artifactBytes: number;
  manifestSha256: string;
  /** True when an identical generation was already published. */
  idempotent: boolean;
  components: ArtifactComponentManifest[];
  pruned: string[];
}

export interface ArtifactHydrateResult {
  generation: string;
  artifactSha256: string;
  components: ArtifactComponentName[];
  files: number;
  symbols: number;
  edges: number;
  fleetRepinned: boolean;
}

export interface ArtifactstatusComponentReport {
  name: ArtifactComponentName;
  kind: 'required' | 'optional';
  portable: boolean;
  presentLocally: boolean;
  schemaVersion: number;
}

export interface ArtifactStatusReport {
  projectId: string;
  projectIdentity: string;
  schemaVersion: number;
  localGeneration?: string;
  remoteGeneration?: string;
  compatibility: 'compatible' | 'incompatible' | 'unknown';
  compatibilityReason?: ArtifactReasonCode;
  sourceMatch: 'exact' | 'different' | 'unknown';
  freshness: 'fresh' | 'stale' | 'absent';
  components: ArtifactstatusComponentReport[];
  nonPortableComponents: ArtifactNonPortableComponent[];
  lastOperation?: 'publish' | 'pull';
  lastOperationAt?: string;
  retainedGenerations: string[];
  generationCount: number;
}
