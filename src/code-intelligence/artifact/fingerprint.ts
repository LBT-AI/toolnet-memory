import { ARTIFACT_CONTAINER_VERSION } from './types.js';

import type { CodeManifest } from '../incremental/manifest.js';

import { canonicalJson } from './serializer.js';

import { sha256Digest, sha256Hex } from './integrity.js';

import { artifactSchemaDigestInput } from './components.js';

import { semanticFingerprint } from '../graph/graph-semantics.js';

import { parserFingerprintDigest } from '../parsers/fingerprint.js';

import { schemaFingerprint } from '../query-v2/schema-registry.js';

import { RESOLUTION_SCHEMA_VERSION } from '../resolution/resolution-engine.js';

/**
 * Deterministic artifact schema fingerprint.
 *
 * Covers the artifact schema version, the component table and its keys, and the
 * container layout version. Changing any of those makes old artifacts and old
 * pagination cursors invalid.
 */
export function artifactSchemaFingerprint(): string {
  return sha256Digest(
    canonicalJson({
      artifactSchema: artifactSchemaDigestInput(),
      containerVersion: ARTIFACT_CONTAINER_VERSION,
    })
  );
}

/**
 * Resolver fingerprint.
 *
 * Resolution semantics are a function of the resolution schema and the parser
 * generation that produced the structural graph, so both are bound together.
 */
export function resolverFingerprint(parserFingerprint: string = parserFingerprintDigest()): string {
  return sha256Digest(
    canonicalJson({
      resolutionSchemaVersion: RESOLUTION_SCHEMA_VERSION,
      parserFingerprint,
    })
  );
}

export function runtimeArtifactFingerprints(): {
  parser: string;
  resolver: string;
  graphSemantics: string;
  querySchema: string;
  artifactSchema: string;
} {
  const parser = parserFingerprintDigest();
  return {
    parser,
    resolver: resolverFingerprint(parser),
    graphSemantics: semanticFingerprint(),
    querySchema: schemaFingerprint(),
    artifactSchema: artifactSchemaFingerprint(),
  };
}

/**
 * Digest over the canonical source manifest (paths + content hashes only).
 *
 * `updatedAt` is deliberately excluded: the source identity must be a function
 * of the source content, not of when the manifest happened to be written.
 */
export function sourceManifestHash(manifest: CodeManifest): string {
  const entries = Object.values(manifest.files)
    .map((entry) => `${entry.path}\u0000${entry.hash}`)
    .sort();

  return sha256Hex(entries.join('\u0001'));
}

export interface ArtifactGenerationInput {
  projectIdentity: string;
  sourceManifestHash: string;
  parser: string;
  resolver: string;
  graphSemantics: string;
  querySchema: string;
  artifactSchema: string;
}

/**
 * Deterministic artifact generation identity.
 *
 * Never a random UUID and never a timestamp: identical source plus identical
 * ToolNet graph versions always yields the identical generation.
 */
export function artifactGeneration(input: ArtifactGenerationInput): string {
  const digest = sha256Hex(
    canonicalJson({
      projectIdentity: input.projectIdentity,
      sourceManifestHash: input.sourceManifestHash,
      parser: input.parser,
      resolver: input.resolver,
      graphSemantics: input.graphSemantics,
      querySchema: input.querySchema,
      artifactSchema: input.artifactSchema,
    })
  );

  return `gen-${digest.slice(0, 32)}`;
}
