import {
  ARTIFACT_SCHEMA_VERSION,
  type ArtifactAdoptionCheck,
  type ArtifactFingerprints,
  type ArtifactReasonCode,
  type CodeIntelligenceArtifactManifest,
} from './types.js';

import { runtimeArtifactFingerprints } from './fingerprint.js';

export interface ArtifactCompatibilityInput {
  manifest: CodeIntelligenceArtifactManifest;
  projectId: string;
  projectIdentity: string;
  /** Runtime fingerprints to compare against (defaults to this process). */
  runtime?: ArtifactFingerprints;
}

/**
 * Deterministic compatibility matrix.
 *
 * Every rejection carries a specific reason code. There is no generic
 * "invalid artifact": a caller must be able to tell why an artifact cannot be
 * adopted.
 *
 * There is deliberately no partial-compatibility path. The query schema is
 * derived from the graph edge registry, so a query-schema mismatch means the
 * artifact was produced by a different semantic ruleset; the artifact is
 * treated as rebuild-required rather than silently partially adopted.
 */
export function checkArtifactCompatibility(
  input: ArtifactCompatibilityInput
): ArtifactAdoptionCheck {
  const runtime = input.runtime ?? runtimeArtifactFingerprints();

  const { manifest } = input;

  if (manifest.projectId !== input.projectId) {
    return reject(
      'ARTIFACT_PROJECT_MISMATCH',
      `Artifact belongs to project ${manifest.projectId}, not ${input.projectId}.`
    );
  }

  if (manifest.projectIdentity !== input.projectIdentity) {
    return reject(
      'ARTIFACT_IDENTITY_MISMATCH',
      'Artifact project identity does not match the local canonical project identity.'
    );
  }

  if (manifest.artifactSchemaVersion !== ARTIFACT_SCHEMA_VERSION) {
    return reject(
      'ARTIFACT_SCHEMA_UNSUPPORTED',
      `Artifact schema ${String(manifest.artifactSchemaVersion)} is not supported.`
    );
  }

  if (manifest.fingerprints.artifactSchema !== runtime.artifactSchema) {
    return reject(
      'ARTIFACT_SCHEMA_UNSUPPORTED',
      'Artifact schema fingerprint does not match this runtime.'
    );
  }

  if (manifest.fingerprints.graphSemantics !== runtime.graphSemantics) {
    return reject(
      'SEMANTIC_SCHEMA_MISMATCH',
      'Artifact graph semantics differ from this runtime; a rebuild is required.'
    );
  }

  /*
   * The graph schema is bound to the semantic schema: the edge registry defines
   * both the semantic fingerprint and the queryable schema.
   */
  if (manifest.fingerprints.querySchema !== runtime.querySchema) {
    return reject(
      'QUERY_SCHEMA_MISMATCH',
      'Artifact query schema differs from this runtime; a rebuild is required.'
    );
  }

  if (manifest.fingerprints.parser !== runtime.parser) {
    return reject(
      'PARSER_FINGERPRINT_MISMATCH',
      'Artifact was produced by a different structural parser generation.'
    );
  }

  if (manifest.fingerprints.resolver !== runtime.resolver) {
    return reject(
      'RESOLVER_FINGERPRINT_MISMATCH',
      'Artifact was produced by a different symbol resolution generation.'
    );
  }

  if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
    return reject('ARTIFACT_MANIFEST_INVALID', 'Artifact has no components.');
  }

  const required = manifest.components.filter((component) => component.kind === 'required');

  const portableRequired = required.filter((component) => component.portable);

  if (portableRequired.length === 0) {
    return reject('ARTIFACT_MANIFEST_INVALID', 'Artifact declares no required portable component.');
  }

  return { adoptable: true };
}

/** True when the artifact was built for the exact same graph schema generation. */
export function graphSchemaCompatible(
  manifest: CodeIntelligenceArtifactManifest,
  runtime: ArtifactFingerprints = runtimeArtifactFingerprints()
): boolean {
  return (
    manifest.fingerprints.graphSemantics === runtime.graphSemantics &&
    manifest.fingerprints.artifactSchema === runtime.artifactSchema
  );
}

function reject(code: ArtifactReasonCode, detail: string): ArtifactAdoptionCheck {
  return { adoptable: false, reason: code, detail };
}

export type { ArtifactReasonCode };
