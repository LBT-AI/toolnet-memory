import {
  ARTIFACT_CONTAINER_VERSION,
  ARTIFACT_SCHEMA_VERSION,
  ArtifactError,
  type ArtifactComponentManifest,
  type ArtifactComponentName,
  type ArtifactFingerprints,
  type ArtifactIntegrity,
  type ArtifactKnowledgeCompatibility,
  type ArtifactNonPortableComponent,
  type ArtifactSourceIdentity,
  type CodeIntelligenceArtifactManifest,
} from './types.js';

import { canonicalJson } from './serializer.js';

import { sha256Hex } from './integrity.js';

import { ARTIFACT_NON_PORTABLE_COMPONENTS } from './components.js';

import { runtimeArtifactFingerprints, sourceManifestHash } from './fingerprint.js';

import type { CodeManifest } from '../incremental/manifest.js';

function readString(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Fingerprints of the graph that is actually being shipped.
 *
 * The graph snapshot records the parser and semantic generations that produced
 * it. Those are authoritative for the artifact because they describe the bytes
 * in the archive; the local runtime values are only a fallback for snapshots
 * written before those fields existed.
 */
export function deriveArtifactFingerprints(graphValue: unknown): ArtifactFingerprints {
  const runtime = runtimeArtifactFingerprints();

  const parser = readString(graphValue, 'parserFingerprint') ?? runtime.parser;

  const graphSemantics = readString(graphValue, 'semanticFingerprint') ?? runtime.graphSemantics;

  return {
    parser,
    resolver: runtime.resolver,
    graphSemantics,
    querySchema: runtime.querySchema,
    artifactSchema: runtime.artifactSchema,
  };
}

export function graphStats(graphValue: unknown): { symbols: number; edges: number } {
  if (!graphValue || typeof graphValue !== 'object') {
    return { symbols: 0, edges: 0 };
  }

  const record = graphValue as Record<string, unknown>;

  const symbols = Array.isArray(record.symbols) ? record.symbols.length : 0;

  const edges = Array.isArray(record.edges) ? record.edges.length : 0;

  return { symbols, edges };
}

export interface BuildArtifactManifestInput {
  projectId: string;
  projectIdentity: string;
  generation: string;
  createdAt: string;
  sourceManifest: CodeManifest;
  fingerprints: ArtifactFingerprints;
  capabilities: string[];
  components: ArtifactComponentManifest[];
  stats: { symbols: number; edges: number };
  artifactHash: string;
  nonPortableComponents?: readonly ArtifactNonPortableComponent[];
  knowledgeCompatibility?: ArtifactKnowledgeCompatibility;
}

export type ArtifactManifestBody = Omit<CodeIntelligenceArtifactManifest, 'integrity'>;

export function artifactManifestBody(input: BuildArtifactManifestInput): ArtifactManifestBody {
  const source: ArtifactSourceIdentity = {
    manifestHash: sourceManifestHash(input.sourceManifest),
    fileCount: Object.keys(input.sourceManifest.files).length,
    manifestUpdatedAt: input.sourceManifest.updatedAt,
  };

  const body: ArtifactManifestBody = {
    version: ARTIFACT_SCHEMA_VERSION,
    artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
    containerVersion: ARTIFACT_CONTAINER_VERSION,

    projectId: input.projectId,
    projectIdentity: input.projectIdentity,

    generation: input.generation,
    createdAt: input.createdAt,

    source,
    fingerprints: input.fingerprints,
    capabilities: [...input.capabilities].sort(),

    components: [...input.components].sort((left, right) => left.name.localeCompare(right.name)),
    nonPortableComponents: [
      ...(input.nonPortableComponents ?? ARTIFACT_NON_PORTABLE_COMPONENTS),
    ].sort((left, right) => left.name.localeCompare(right.name)),

    stats: input.stats,
  };

  if (input.knowledgeCompatibility) {
    body.knowledgeCompatibility = input.knowledgeCompatibility;
  }

  return body;
}

export function buildArtifactManifest(
  input: BuildArtifactManifestInput
): CodeIntelligenceArtifactManifest {
  const body = artifactManifestBody(input);

  const integrity: ArtifactIntegrity = {
    algorithm: 'sha256',
    artifactHash: input.artifactHash,
    manifestHash: sha256Hex(canonicalJson(body)),
  };

  return { ...body, integrity };
}

/**
 * Structural validation of a manifest read from storage.
 *
 * A manifest that does not describe itself consistently is rejected before any
 * of its bytes are trusted.
 */
export function verifyArtifactManifest(
  manifest: CodeIntelligenceArtifactManifest
): CodeIntelligenceArtifactManifest {
  if (!manifest || typeof manifest !== 'object') {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact manifest is not an object.');
  }

  if (manifest.version !== ARTIFACT_SCHEMA_VERSION) {
    throw new ArtifactError(
      'ARTIFACT_SCHEMA_UNSUPPORTED',
      `Unsupported artifact schema version: ${String(manifest.version)}`
    );
  }

  if (manifest.artifactSchemaVersion !== ARTIFACT_SCHEMA_VERSION) {
    throw new ArtifactError(
      'ARTIFACT_SCHEMA_UNSUPPORTED',
      `Unsupported artifact schema version: ${String(manifest.artifactSchemaVersion)}`
    );
  }

  if (manifest.containerVersion !== ARTIFACT_CONTAINER_VERSION) {
    throw new ArtifactError(
      'ARTIFACT_CONTAINER_UNSUPPORTED',
      `Unsupported artifact container version: ${String(manifest.containerVersion)}`
    );
  }

  if (
    typeof manifest.projectId !== 'string' ||
    typeof manifest.projectIdentity !== 'string' ||
    typeof manifest.generation !== 'string'
  ) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact manifest is missing identity.');
  }

  if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact manifest has no components.');
  }

  if (
    !manifest.integrity ||
    manifest.integrity.algorithm !== 'sha256' ||
    typeof manifest.integrity.artifactHash !== 'string' ||
    typeof manifest.integrity.manifestHash !== 'string'
  ) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact manifest integrity is invalid.');
  }

  const { integrity, ...body } = manifest;

  const recomputed = sha256Hex(canonicalJson(body));

  if (recomputed !== integrity.manifestHash) {
    throw new ArtifactError('ARTIFACT_HASH_MISMATCH', 'Artifact manifest integrity check failed.');
  }

  return manifest;
}

export function manifestComponentNames(
  manifest: CodeIntelligenceArtifactManifest
): ArtifactComponentName[] {
  return manifest.components.map((component) => component.name);
}
